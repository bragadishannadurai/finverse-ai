import { Request, Response } from 'express';
import AIChat from '../models/AIChat';
import { chatWithAI, generateFinancialInsights, generateInvestmentAdvice } from '../services/aiService';
import { sendSuccess, sendCreated, getPaginationParams, paginateMeta } from '../utils/apiResponse';
import { asyncHandler, NotFoundError, AppError } from '../utils/errors';
import Expense from '../models/Expense';
import Income from '../models/Income';
import Investment from '../models/Investment';
import SavingsGoal from '../models/SavingsGoal';
import BankAccount from '../models/BankAccount';
import mongoose from 'mongoose';

const getUserFinancialContext = async (userId: string) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [incomeData, expenseData, investmentData, savingsData, bankData, topCategoryData] = await Promise.all([
    Income.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Investment.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), isActive: true } },
      { $group: { _id: null, totalInvested: { $sum: '$investedAmount' }, currentValue: { $sum: '$currentValue' } } },
    ]),
    SavingsGoal.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), isActive: true } },
      { $group: { _id: null, total: { $sum: '$currentAmount' } } },
    ]),
    // Sum of all active bank account balances
    BankAccount.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), isActive: true } },
      { $group: { _id: null, total: { $sum: '$balance' } } },
    ]),
    // Top expense categories this month
    Expense.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(userId), date: { $gte: startOfMonth } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'cat',
        },
      },
      {
        $project: {
          name: { $ifNull: [{ $arrayElemAt: ['$cat.name', 0] }, 'Other'] },
          total: 1,
        },
      },
    ]),
  ]);

  const totalIncome = incomeData[0]?.total || 0;
  const totalExpenses = expenseData[0]?.total || 0;
  const totalInvestments = investmentData[0]?.currentValue || 0;
  const totalSavings = savingsData[0]?.total || 0;
  const bankBalance = bankData[0]?.total || 0;
  const topCategories = (topCategoryData as Array<{ name: string; total: number }>) || [];

  return {
    totalIncome,
    totalExpenses,
    totalSavings,
    totalInvestments,
    bankBalance,
    topCategories,
    netWorth: totalSavings + totalInvestments + bankBalance,
  };
};

// GET /api/ai/chats
export const getChats = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, skip } = getPaginationParams(req.query as Record<string, unknown>);

  const [chats, total] = await Promise.all([
    AIChat.find({ user: req.userId, isArchived: false })
      .select('title createdAt updatedAt totalTokens aiModel')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AIChat.countDocuments({ user: req.userId, isArchived: false }),
  ]);

  sendSuccess(res, { data: chats, meta: paginateMeta({ page, limit, total }) });
});

// POST /api/ai/chats
export const createChat = asyncHandler(async (req: Request, res: Response) => {
  const chat = await AIChat.create({
    user: req.userId,
    title: req.body.title || 'New Chat',
    messages: [],
  });
  sendCreated(res, { message: 'Chat created', data: chat });
});

// GET /api/ai/chats/:id
export const getChat = asyncHandler(async (req: Request, res: Response) => {
  const chat = await AIChat.findOne({ _id: req.params.id, user: req.userId });
  if (!chat) throw new NotFoundError('Chat not found');
  sendSuccess(res, { data: chat });
});

// POST /api/ai/chats/:id/message
export const sendMessage = asyncHandler(async (req: Request, res: Response) => {
  const { message } = req.body;
  if (!message?.trim()) throw new AppError('Message is required', 400);

  const chat = await AIChat.findOne({ _id: req.params.id, user: req.userId });
  if (!chat) throw new NotFoundError('Chat not found');

  // Get financial context
  const context = await getUserFinancialContext(req.userId!);

  // Prepare messages for OpenAI (last 20 messages for context window)
  const historyMessages = chat.messages.slice(-20).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  historyMessages.push({ role: 'user', content: message });

  const { content, tokens } = await chatWithAI(historyMessages, context);

  // Update chat with new messages
  chat.messages.push({ role: 'user', content: message, timestamp: new Date() });
  chat.messages.push({ role: 'assistant', content, timestamp: new Date(), tokens });
  chat.totalTokens += tokens;

  // Auto-update title for new chats
  if (chat.messages.length === 2) {
    chat.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
  }

  await chat.save();

  sendSuccess(res, {
    message: 'Message sent',
    data: {
      userMessage: message,
      assistantMessage: content,
      chatId: chat._id,
    },
  });
});

// GET /api/ai/insights
export const getInsights = asyncHandler(async (req: Request, res: Response) => {
  const context = await getUserFinancialContext(req.userId!);
  const rawInsights = await generateFinancialInsights(context);

  let insights;
  try {
    const parsed = JSON.parse(rawInsights);
    insights = parsed.insights || [];
  } catch {
    insights = [];
  }

  sendSuccess(res, { data: { insights, context } });
});

// DELETE /api/ai/chats/:id
export const deleteChat = asyncHandler(async (req: Request, res: Response) => {
  const chat = await AIChat.findOne({ _id: req.params.id, user: req.userId });
  if (!chat) throw new NotFoundError('Chat not found');
  await chat.deleteOne();
  sendSuccess(res, { message: 'Chat deleted' });
});

// GET /api/ai/investment-advice
export const getInvestmentAdvice = asyncHandler(async (req: Request, res: Response) => {
  const context = await getUserFinancialContext(req.userId!);
  const advice = await generateInvestmentAdvice(context);
  sendSuccess(res, { data: { advice, context } });
});

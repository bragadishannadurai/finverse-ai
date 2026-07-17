"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvestmentAdvice = exports.deleteChat = exports.getInsights = exports.sendMessage = exports.getChat = exports.createChat = exports.getChats = void 0;
const AIChat_1 = __importDefault(require("../models/AIChat"));
const aiService_1 = require("../services/aiService");
const apiResponse_1 = require("../utils/apiResponse");
const errors_1 = require("../utils/errors");
const Expense_1 = __importDefault(require("../models/Expense"));
const Income_1 = __importDefault(require("../models/Income"));
const Investment_1 = __importDefault(require("../models/Investment"));
const SavingsGoal_1 = __importDefault(require("../models/SavingsGoal"));
const BankAccount_1 = __importDefault(require("../models/BankAccount"));
const mongoose_1 = __importDefault(require("mongoose"));
const getUserFinancialContext = async (userId) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const [incomeData, expenseData, investmentData, savingsData, bankData, topCategoryData] = await Promise.all([
        Income_1.default.aggregate([
            { $match: { user: new mongoose_1.default.Types.ObjectId(userId), date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Expense_1.default.aggregate([
            { $match: { user: new mongoose_1.default.Types.ObjectId(userId), date: { $gte: startOfMonth } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Investment_1.default.aggregate([
            { $match: { user: new mongoose_1.default.Types.ObjectId(userId), isActive: true } },
            { $group: { _id: null, totalInvested: { $sum: '$investedAmount' }, currentValue: { $sum: '$currentValue' } } },
        ]),
        SavingsGoal_1.default.aggregate([
            { $match: { user: new mongoose_1.default.Types.ObjectId(userId), isActive: true } },
            { $group: { _id: null, total: { $sum: '$currentAmount' } } },
        ]),
        // Sum of all active bank account balances
        BankAccount_1.default.aggregate([
            { $match: { user: new mongoose_1.default.Types.ObjectId(userId), isActive: true } },
            { $group: { _id: null, total: { $sum: '$balance' } } },
        ]),
        // Top expense categories this month
        Expense_1.default.aggregate([
            { $match: { user: new mongoose_1.default.Types.ObjectId(userId), date: { $gte: startOfMonth } } },
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
    const topCategories = topCategoryData || [];
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
exports.getChats = (0, errors_1.asyncHandler)(async (req, res) => {
    const { page, limit, skip } = (0, apiResponse_1.getPaginationParams)(req.query);
    const [chats, total] = await Promise.all([
        AIChat_1.default.find({ user: req.userId, isArchived: false })
            .select('title createdAt updatedAt totalTokens aiModel')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        AIChat_1.default.countDocuments({ user: req.userId, isArchived: false }),
    ]);
    (0, apiResponse_1.sendSuccess)(res, { data: chats, meta: (0, apiResponse_1.paginateMeta)({ page, limit, total }) });
});
// POST /api/ai/chats
exports.createChat = (0, errors_1.asyncHandler)(async (req, res) => {
    const chat = await AIChat_1.default.create({
        user: req.userId,
        title: req.body.title || 'New Chat',
        messages: [],
    });
    (0, apiResponse_1.sendCreated)(res, { message: 'Chat created', data: chat });
});
// GET /api/ai/chats/:id
exports.getChat = (0, errors_1.asyncHandler)(async (req, res) => {
    const chat = await AIChat_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!chat)
        throw new errors_1.NotFoundError('Chat not found');
    (0, apiResponse_1.sendSuccess)(res, { data: chat });
});
// POST /api/ai/chats/:id/message
exports.sendMessage = (0, errors_1.asyncHandler)(async (req, res) => {
    const { message } = req.body;
    if (!message?.trim())
        throw new errors_1.AppError('Message is required', 400);
    const chat = await AIChat_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!chat)
        throw new errors_1.NotFoundError('Chat not found');
    // Get financial context
    const context = await getUserFinancialContext(req.userId);
    // Prepare messages for OpenAI (last 20 messages for context window)
    const historyMessages = chat.messages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
    }));
    historyMessages.push({ role: 'user', content: message });
    const { content, tokens } = await (0, aiService_1.chatWithAI)(historyMessages, context);
    // Update chat with new messages
    chat.messages.push({ role: 'user', content: message, timestamp: new Date() });
    chat.messages.push({ role: 'assistant', content, timestamp: new Date(), tokens });
    chat.totalTokens += tokens;
    // Auto-update title for new chats
    if (chat.messages.length === 2) {
        chat.title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    }
    await chat.save();
    (0, apiResponse_1.sendSuccess)(res, {
        message: 'Message sent',
        data: {
            userMessage: message,
            assistantMessage: content,
            chatId: chat._id,
        },
    });
});
// GET /api/ai/insights
exports.getInsights = (0, errors_1.asyncHandler)(async (req, res) => {
    const context = await getUserFinancialContext(req.userId);
    const rawInsights = await (0, aiService_1.generateFinancialInsights)(context);
    let insights;
    try {
        const parsed = JSON.parse(rawInsights);
        insights = parsed.insights || [];
    }
    catch {
        insights = [];
    }
    (0, apiResponse_1.sendSuccess)(res, { data: { insights, context } });
});
// DELETE /api/ai/chats/:id
exports.deleteChat = (0, errors_1.asyncHandler)(async (req, res) => {
    const chat = await AIChat_1.default.findOne({ _id: req.params.id, user: req.userId });
    if (!chat)
        throw new errors_1.NotFoundError('Chat not found');
    await chat.deleteOne();
    (0, apiResponse_1.sendSuccess)(res, { message: 'Chat deleted' });
});
// GET /api/ai/investment-advice
exports.getInvestmentAdvice = (0, errors_1.asyncHandler)(async (req, res) => {
    const context = await getUserFinancialContext(req.userId);
    const advice = await (0, aiService_1.generateInvestmentAdvice)(context);
    (0, apiResponse_1.sendSuccess)(res, { data: { advice, context } });
});
//# sourceMappingURL=aiController.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const Budget_1 = __importDefault(require("../models/Budget"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Income_1 = __importDefault(require("../models/Income"));
const Notification_1 = __importDefault(require("../models/Notification"));
const SavingsGoal_1 = __importDefault(require("../models/SavingsGoal"));
const BankAccount_1 = __importDefault(require("../models/BankAccount"));
const Transaction_1 = __importDefault(require("../models/Transaction"));
const Investment_1 = __importDefault(require("../models/Investment"));
const logger_1 = __importDefault(require("../utils/logger"));
const redis_1 = require("../config/redis");
const socketManager_1 = require("../sockets/socketManager");
/**
 * Sync budget spending for all active budgets — runs every hour.
 */
const syncBudgets = async () => {
    try {
        const now = new Date();
        const budgets = await Budget_1.default.find({
            isActive: true,
            endDate: { $gte: now },
        });
        for (const budget of budgets) {
            const [result] = await Expense_1.default.aggregate([
                {
                    $match: {
                        user: budget.user,
                        category: budget.category,
                        date: { $gte: budget.startDate, $lte: budget.endDate },
                    },
                },
                { $group: { _id: null, total: { $sum: '$amount' } } },
            ]);
            const spent = result?.total || 0;
            await budget.updateOne({ spent });
            const percentage = (spent / budget.amount) * 100;
            if (percentage >= budget.alertAt && !budget.isAlertSent) {
                const notification = await Notification_1.default.create({
                    user: budget.user,
                    type: 'budget_alert',
                    title: `Budget Alert: ${budget.name}`,
                    message: `You've used ${Math.round(percentage)}% of your ${budget.name} budget (₹${spent.toLocaleString('en-IN')} / ₹${budget.amount.toLocaleString('en-IN')})`,
                    priority: percentage >= 100 ? 'critical' : 'high',
                    icon: percentage >= 100 ? '🚨' : '⚠️',
                });
                await budget.updateOne({ isAlertSent: true });
                (0, socketManager_1.emitNotification)(budget.user.toString(), {
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    priority: notification.priority,
                    icon: notification.icon,
                });
                // Invalidate dashboard cache
                await (0, redis_1.cacheDelPattern)(`dashboard:${budget.user}`);
            }
        }
        logger_1.default.info(`Budget sync completed for ${budgets.length} budgets`);
    }
    catch (error) {
        logger_1.default.error('Budget sync job error:', error);
    }
};
/**
 * Process recurring expenses — runs daily at midnight.
 * Since models don't have nextDueDate, we find recurring items whose last date
 * was before today minus their interval, and create the next occurrence.
 */
const processRecurringExpenses = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const recurringExpenses = await Expense_1.default.find({ isRecurring: true });
        for (const expense of recurringExpenses) {
            // Find the most recent occurrence for this recurring template
            const mostRecent = await Expense_1.default.findOne({
                user: expense.user,
                title: expense.title,
                isRecurring: true,
                recurringInterval: expense.recurringInterval,
            }).sort({ date: -1 });
            if (!mostRecent)
                continue;
            const lastDate = new Date(mostRecent.date);
            lastDate.setHours(0, 0, 0, 0);
            // Calculate when the next occurrence is due
            const nextDue = new Date(lastDate);
            switch (expense.recurringInterval) {
                case 'daily':
                    nextDue.setDate(nextDue.getDate() + 1);
                    break;
                case 'weekly':
                    nextDue.setDate(nextDue.getDate() + 7);
                    break;
                case 'monthly':
                    nextDue.setMonth(nextDue.getMonth() + 1);
                    break;
                case 'yearly':
                    nextDue.setFullYear(nextDue.getFullYear() + 1);
                    break;
                default: continue;
            }
            if (nextDue > today)
                continue;
            // Check recurringEndDate
            if (expense.recurringEndDate && today > expense.recurringEndDate)
                continue;
            await Expense_1.default.create({
                user: expense.user,
                title: expense.title,
                amount: expense.amount,
                category: expense.category,
                paymentMethod: expense.paymentMethod,
                currency: expense.currency,
                isRecurring: true,
                recurringInterval: expense.recurringInterval,
                recurringEndDate: expense.recurringEndDate,
                notes: `Auto-generated from recurring expense`,
                date: today,
            });
            await (0, redis_1.cacheDelPattern)(`dashboard:${expense.user}`);
        }
        logger_1.default.info('Recurring expenses processing completed');
    }
    catch (error) {
        logger_1.default.error('Recurring expenses job error:', error);
    }
};
/**
 * Process recurring income — runs daily at midnight.
 */
const processRecurringIncome = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const recurringIncomes = await Income_1.default.find({ isRecurring: true });
        for (const income of recurringIncomes) {
            const mostRecent = await Income_1.default.findOne({
                user: income.user,
                title: income.title,
                isRecurring: true,
                recurringInterval: income.recurringInterval,
            }).sort({ date: -1 });
            if (!mostRecent)
                continue;
            const lastDate = new Date(mostRecent.date);
            lastDate.setHours(0, 0, 0, 0);
            const nextDue = new Date(lastDate);
            switch (income.recurringInterval) {
                case 'weekly':
                    nextDue.setDate(nextDue.getDate() + 7);
                    break;
                case 'bi-weekly':
                    nextDue.setDate(nextDue.getDate() + 14);
                    break;
                case 'monthly':
                    nextDue.setMonth(nextDue.getMonth() + 1);
                    break;
                case 'quarterly':
                    nextDue.setMonth(nextDue.getMonth() + 3);
                    break;
                case 'yearly':
                    nextDue.setFullYear(nextDue.getFullYear() + 1);
                    break;
                default: continue;
            }
            if (nextDue > today)
                continue;
            await Income_1.default.create({
                user: income.user,
                title: income.title,
                amount: income.amount,
                source: income.source,
                category: income.category,
                currency: income.currency,
                isRecurring: true,
                recurringInterval: income.recurringInterval,
                taxable: income.taxable,
                taxRate: income.taxRate,
                notes: `Auto-generated from recurring income`,
                date: today,
            });
            await (0, redis_1.cacheDelPattern)(`dashboard:${income.user}`);
        }
        logger_1.default.info('Recurring income processing completed');
    }
    catch (error) {
        logger_1.default.error('Recurring income job error:', error);
    }
};
/**
 * Check savings goal auto-save — runs daily at 9 AM.
 */
const checkSavingsAutoSave = async () => {
    try {
        const goals = await SavingsGoal_1.default.find({
            autoSave: true,
            isActive: true,
            isCompleted: false,
        });
        for (const goal of goals) {
            if (!goal.autoSaveAmount || !goal.autoSaveInterval)
                continue;
            const today = new Date();
            const dayOfWeek = today.getDay(); // 0 = Sunday
            const dayOfMonth = today.getDate();
            let shouldSave = false;
            if (goal.autoSaveInterval === 'daily')
                shouldSave = true;
            if (goal.autoSaveInterval === 'weekly' && dayOfWeek === 1)
                shouldSave = true; // Mondays
            if (goal.autoSaveInterval === 'monthly' && dayOfMonth === 1)
                shouldSave = true;
            // Or if nextPayDate is reached
            if (goal.nextPayDate && new Date(goal.nextPayDate) <= today) {
                shouldSave = true;
            }
            if (!shouldSave)
                continue;
            // Handle linked bank account deduction
            let bankDeductionSuccess = true;
            let newBankBalance = 0;
            if (goal.autoSaveBankAccount) {
                const bankAccount = await BankAccount_1.default.findOne({ _id: goal.autoSaveBankAccount, user: goal.user, isActive: true });
                if (bankAccount) {
                    if (bankAccount.balance >= goal.autoSaveAmount) {
                        newBankBalance = bankAccount.balance - goal.autoSaveAmount;
                        await bankAccount.updateOne({ balance: newBankBalance, lastSynced: new Date() });
                        // Log transaction
                        await Transaction_1.default.create({
                            user: goal.user,
                            type: 'debit',
                            amount: goal.autoSaveAmount,
                            description: `Auto-save: ${goal.name}`,
                            bankAccount: bankAccount._id,
                            date: new Date(),
                            status: 'completed',
                            paymentMethod: 'bank_transfer',
                            balance: newBankBalance,
                            tags: ['auto-save', 'savings-goal'],
                        });
                    }
                    else {
                        bankDeductionSuccess = false;
                        // Notify user about insufficient funds
                        await Notification_1.default.create({
                            user: goal.user,
                            type: 'savings_milestone',
                            title: `⚠️ Auto-save Failed: ${goal.name}`,
                            message: `Auto-save of ₹${goal.autoSaveAmount.toLocaleString('en-IN')} failed due to insufficient funds in your linked bank account.`,
                            priority: 'high',
                            icon: '⚠️',
                        });
                        (0, socketManager_1.emitNotification)(goal.user.toString(), {
                            type: 'savings_milestone',
                            title: `⚠️ Auto-save Failed: ${goal.name}`,
                            message: `Auto-save failed due to insufficient funds.`,
                            priority: 'high',
                            icon: '⚠️',
                        });
                    }
                }
            }
            if (!bankDeductionSuccess)
                continue;
            const newAmount = Math.min(goal.currentAmount + goal.autoSaveAmount, goal.targetAmount);
            const isCompleted = newAmount >= goal.targetAmount;
            // Calculate next due date
            let nextPayDate = new Date();
            if (goal.autoSaveInterval === 'daily')
                nextPayDate.setDate(nextPayDate.getDate() + 1);
            else if (goal.autoSaveInterval === 'weekly')
                nextPayDate.setDate(nextPayDate.getDate() + 7);
            else
                nextPayDate.setMonth(nextPayDate.getMonth() + 1);
            await goal.updateOne({
                currentAmount: newAmount,
                isCompleted,
                lastPaidAt: new Date(),
                nextPayDate,
                ...(isCompleted ? { completedAt: new Date() } : {}),
            });
            if (isCompleted) {
                await Notification_1.default.create({
                    user: goal.user,
                    type: 'savings_milestone',
                    title: `🎉 Goal Achieved: ${goal.name}`,
                    message: `Congratulations! You've reached your savings goal of ₹${goal.targetAmount.toLocaleString('en-IN')}`,
                    priority: 'high',
                    icon: '🎯',
                });
                (0, socketManager_1.emitNotification)(goal.user.toString(), {
                    type: 'savings_milestone',
                    title: `🎉 Goal Achieved: ${goal.name}`,
                    message: `You've reached your savings goal of ₹${goal.targetAmount.toLocaleString('en-IN')}`,
                    priority: 'high',
                    icon: '🎯',
                });
            }
            await (0, redis_1.cacheDelPattern)(`dashboard:${goal.user}`);
        }
    }
    catch (error) {
        logger_1.default.error('Savings auto-save job error:', error);
    }
};
/**
 * Check investments auto-pay — runs daily at 9 AM.
 */
const checkInvestmentAutoPay = async () => {
    try {
        const today = new Date();
        const investments = await Investment_1.default.find({
            autoPay: true,
            isActive: true,
            nextPayDate: { $lte: today },
        });
        for (const inv of investments) {
            if (!inv.autoPayAmount || !inv.autoPayBankAccount)
                continue;
            const bankAccount = await BankAccount_1.default.findOne({ _id: inv.autoPayBankAccount, user: inv.user, isActive: true });
            if (!bankAccount)
                continue;
            if (bankAccount.balance >= inv.autoPayAmount) {
                const newBalance = bankAccount.balance - inv.autoPayAmount;
                // Calculate next pay date
                let nextPayDate = new Date();
                if (inv.autoPayInterval === 'weekly')
                    nextPayDate.setDate(nextPayDate.getDate() + 7);
                else
                    nextPayDate.setMonth(nextPayDate.getMonth() + 1);
                await Promise.all([
                    bankAccount.updateOne({ balance: newBalance, lastSynced: new Date() }),
                    Transaction_1.default.create({
                        user: inv.user,
                        type: 'debit',
                        amount: inv.autoPayAmount,
                        description: `Auto-pay: ${inv.name}`,
                        bankAccount: bankAccount._id,
                        date: new Date(),
                        status: 'completed',
                        paymentMethod: 'bank_transfer',
                        balance: newBalance,
                        tags: ['auto-pay', 'investment'],
                    }),
                    inv.updateOne({
                        investedAmount: inv.investedAmount + inv.autoPayAmount,
                        lastPaidAt: new Date(),
                        nextPayDate,
                        lastUpdated: new Date(),
                    }),
                    Notification_1.default.create({
                        user: inv.user,
                        type: 'investment_alert',
                        title: `🚀 Auto-pay Successful: ${inv.name}`,
                        message: `Auto-pay of ₹${inv.autoPayAmount.toLocaleString('en-IN')} successfully invested in ${inv.name}.`,
                        priority: 'medium',
                        icon: '🚀',
                    })
                ]);
                (0, socketManager_1.emitNotification)(inv.user.toString(), {
                    type: 'investment_alert',
                    title: `🚀 Auto-pay Successful: ${inv.name}`,
                    message: `Auto-pay of ₹${inv.autoPayAmount.toLocaleString('en-IN')} invested.`,
                    priority: 'medium',
                    icon: '🚀',
                });
                await (0, redis_1.cacheDelPattern)(`dashboard:${inv.user}`);
            }
            else {
                // Insufficient funds notification
                await Promise.all([
                    Notification_1.default.create({
                        user: inv.user,
                        type: 'investment_alert',
                        title: `⚠️ Auto-pay Failed: ${inv.name}`,
                        message: `Auto-pay of ₹${inv.autoPayAmount.toLocaleString('en-IN')} failed due to insufficient funds in your linked bank account.`,
                        priority: 'high',
                        icon: '⚠️',
                    })
                ]);
                (0, socketManager_1.emitNotification)(inv.user.toString(), {
                    type: 'investment_alert',
                    title: `⚠️ Auto-pay Failed: ${inv.name}`,
                    message: `Auto-pay failed due to insufficient funds.`,
                    priority: 'high',
                    icon: '⚠️',
                });
            }
        }
    }
    catch (error) {
        logger_1.default.error('Investment auto-pay job error:', error);
    }
};
/**
 * Clean up expired sessions / old data — runs at 2 AM daily.
 */
const cleanupExpiredData = async () => {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Clean up archived notifications older than 30 days
        const deleted = await Notification_1.default.deleteMany({
            isArchived: true,
            createdAt: { $lt: thirtyDaysAgo },
        });
        if (deleted.deletedCount > 0) {
            logger_1.default.info(`Cleaned up ${deleted.deletedCount} archived notifications`);
        }
    }
    catch (error) {
        logger_1.default.error('Cleanup job error:', error);
    }
};
/**
 * Register all cron jobs.
 */
const scheduleCronJobs = () => {
    // Sync budgets every hour
    node_cron_1.default.schedule('0 * * * *', syncBudgets, { timezone: 'Asia/Kolkata' });
    // Process recurring transactions at midnight
    node_cron_1.default.schedule('0 0 * * *', async () => {
        await processRecurringExpenses();
        await processRecurringIncome();
    }, { timezone: 'Asia/Kolkata' });
    // Check savings auto-save at 9 AM daily
    node_cron_1.default.schedule('0 9 * * *', async () => {
        await checkSavingsAutoSave();
        await checkInvestmentAutoPay();
    }, { timezone: 'Asia/Kolkata' });
    // Cleanup at 2 AM daily
    node_cron_1.default.schedule('0 2 * * *', cleanupExpiredData, { timezone: 'Asia/Kolkata' });
    logger_1.default.info('Cron jobs scheduled');
};
exports.scheduleCronJobs = scheduleCronJobs;
//# sourceMappingURL=cronJobs.js.map
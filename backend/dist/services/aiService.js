"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvestmentAdvice = exports.analyzeReceiptWithAI = exports.generateFinancialInsights = exports.chatWithAI = void 0;
const openai_1 = __importDefault(require("openai"));
const env_1 = __importDefault(require("../config/env"));
const logger_1 = __importDefault(require("../utils/logger"));
const errors_1 = require("../utils/errors");
const openai = new openai_1.default({ apiKey: env_1.default.OPENAI_API_KEY || 'placeholder-key' });
const SYSTEM_PROMPT = `You are FinVerse AI, an expert personal finance advisor with deep knowledge in:
- Personal budgeting and expense tracking
- Investment strategies (stocks, mutual funds, SIP, gold, crypto, fixed deposits)
- Tax planning and optimization (Indian context)
- Savings strategies and emergency fund building
- Debt management
- Financial goal planning

You analyze the user's real financial data to provide personalized, actionable advice.
Keep responses concise, data-driven, and actionable. Use emojis sparingly for readability.
Always be encouraging while being honest about financial situations.
Format numbers in Indian Rupee (₹) format when dealing with Indian users.`;
const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;
const getSmartLocalResponse = (messages, ctx) => {
    const userMsg = (messages[messages.length - 1]?.content || '').toLowerCase();
    const income = ctx.totalIncome || 0;
    const expenses = ctx.totalExpenses || 0;
    const savings = ctx.totalSavings || 0;
    const investments = ctx.totalInvestments || 0;
    const netWorth = ctx.netWorth || 0;
    const surplus = income - expenses;
    const savingsRate = income > 0 ? Math.round((surplus / income) * 100) : 0;
    const expenseRatio = income > 0 ? Math.round((expenses / income) * 100) : 0;
    // ── Investment questions (checked FIRST to avoid false matches from spending regex) ──
    if (/invest|where.*invest|stock|mutual fund|sip|portfolio|return|equity|crypto|gold/.test(userMsg)) {
        const bankBalance = ctx.bankBalance || 0;
        const topCats = ctx.topCategories;
        return `📈 **Investment Snapshot**\n\n` +
            `- **Total Invested:** ${fmt(investments)}\n` +
            `- **Net Worth:** ${fmt(netWorth)}\n` +
            `- **Bank Balance:** ${bankBalance > 0 ? fmt(bankBalance) : 'No linked bank accounts'}\n` +
            `- **Monthly Surplus Available:** ${fmt(surplus)}\n\n` +
            (surplus > 0
                ? `💡 With ${fmt(surplus)} available monthly, here's a suggested allocation:\n\n` +
                    `• **SIP (Equity Mutual Funds):** ${fmt(Math.round(surplus * 0.5))} — long-term wealth building\n` +
                    `• **Emergency/Liquid Fund:** ${fmt(Math.round(surplus * 0.3))} — until you hit 6-month buffer\n` +
                    `• **Gold / Bonds:** ${fmt(Math.round(surplus * 0.2))} — diversification\n\n` +
                    `📌 Start with index funds (Nifty 50 / Sensex) for low-cost, diversified equity exposure.`
                : `⚠️ Your expenses exceed income this month. Focus on reducing expenses before adding new investments.`);
    }
    // ── Savings questions ──
    if (/sav|saving|emergency|fund/.test(userMsg)) {
        return `💰 **Your Savings Overview**\n\n` +
            `- **Current Savings:** ${fmt(savings)}\n` +
            `- **Monthly Surplus:** ${fmt(surplus)}\n` +
            `- **Savings Rate:** ${savingsRate}%\n\n` +
            (savingsRate >= 20
                ? `🌟 Excellent! A ${savingsRate}% savings rate puts you ahead of most people. Financial experts recommend at least 20%.\n\n💡 Make sure you have 3–6 months of expenses (${fmt(expenses * 3)}–${fmt(expenses * 6)}) as an emergency fund before aggressively investing.`
                : `📌 Your savings rate is ${savingsRate}%. Aim for at least 20% — that means saving ${fmt(Math.round(income * 0.2))} per month.\n\n💡 **Quick wins:** Cancel unused subscriptions, meal-prep instead of dining out, and automate transfers to a savings account on payday.`);
    }
    // ── Spending / expense questions ──
    if (/spend|spent|expense|how much|top categor/.test(userMsg)) {
        if (income === 0 && expenses === 0) {
            return `📊 I don't see any recorded expenses yet this month. Start by adding your expenses and I'll give you a detailed breakdown of where your money is going!`;
        }
        const topCats = ctx.topCategories;
        const catLines = topCats && topCats.length > 0
            ? `\n\n**Top Spending Categories:**\n${topCats.slice(0, 5).map((c, i) => `${i + 1}. ${c.name}: ${fmt(c.total)}`).join('\n')}`
            : '';
        return `📊 **Your Spending Summary (This Month)**\n\n` +
            `- **Total Expenses:** ${fmt(expenses)}\n` +
            `- **Income:** ${fmt(income)}\n` +
            `- **Expense Ratio:** ${expenseRatio}% of your income\n` +
            `- **Remaining Surplus:** ${fmt(surplus)}` +
            catLines + `\n\n` +
            (expenseRatio > 70
                ? `⚠️ You're spending **${expenseRatio}%** of your income — that's high. Aim to keep expenses below 70% (50/30/20 rule).\n\n💡 **Tip:** Check your top categories in the Expenses section for the biggest opportunities to cut back.`
                : `✅ Good job! You're spending ${expenseRatio}% of your income, which is within a healthy range. Keep tracking to stay on course.`);
    }
    // ── Budget questions ──
    if (/budget|limit|overspend|over budget/.test(userMsg)) {
        return `📋 **Budgeting Advice**\n\n` +
            `Based on your income of ${fmt(income)}, the **50/30/20 rule** suggests:\n\n` +
            `• **50% Needs** (rent, groceries, utilities): ${fmt(Math.round(income * 0.5))}\n` +
            `• **30% Wants** (dining, entertainment, shopping): ${fmt(Math.round(income * 0.3))}\n` +
            `• **20% Savings/Investments:** ${fmt(Math.round(income * 0.2))}\n\n` +
            `You're currently spending ${fmt(expenses)} (${expenseRatio}% of income). ` +
            (expenseRatio > 80 ? `⚠️ You're over the 80% threshold — review your largest expense categories.` : `✅ You're within a manageable range.`);
    }
    // Net worth / wealth questions
    if (/net worth|wealth|asset|rich/.test(userMsg)) {
        return `💼 **Net Worth Summary**\n\n` +
            `- **Total Savings:** ${fmt(savings)}\n` +
            `- **Total Investments:** ${fmt(investments)}\n` +
            `- **Estimated Net Worth:** ${fmt(netWorth)}\n\n` +
            `📌 Net worth grows when you consistently save and invest the surplus between income and expenses. ` +
            `At your current surplus rate of ${fmt(surplus)}/month, small consistent investments compound significantly over time.`;
    }
    // Greetings
    if (/^(hi|hello|hey|howdy|what's up|sup)\b/.test(userMsg)) {
        return `👋 Hello! I'm **FinVerse AI**, your personal finance advisor.\n\n` +
            `Here's your quick financial snapshot:\n` +
            `- 💵 Income: ${income > 0 ? fmt(income) : 'Not recorded yet'}\n` +
            `- 💸 Expenses: ${expenses > 0 ? fmt(expenses) : 'Not recorded yet'}\n` +
            `- 💰 Savings: ${savings > 0 ? fmt(savings) : 'Not recorded yet'}\n\n` +
            `Ask me anything like:\n` +
            `• *"Where am I spending the most?"*\n` +
            `• *"How can I improve my savings rate?"*\n` +
            `• *"What should I invest in?"*\n` +
            `• *"Create a budget for me"*`;
    }
    // Default helpful response
    return `💡 **FinVerse AI Financial Advisor**\n\n` +
        `Your current financial summary:\n` +
        `- Monthly Income: ${income > 0 ? fmt(income) : 'Add your income to get started'}\n` +
        `- Monthly Expenses: ${expenses > 0 ? fmt(expenses) : 'Add expenses to track spending'}\n` +
        `- Savings Rate: ${income > 0 ? `${savingsRate}%` : 'N/A'}\n` +
        `- Net Worth: ${netWorth > 0 ? fmt(netWorth) : 'Record savings & investments'}\n\n` +
        `I can help you with:\n` +
        `• Spending analysis & budget optimization\n` +
        `• Savings strategies & emergency fund planning\n` +
        `• Investment recommendations (SIP, mutual funds, gold)\n` +
        `• Tax-saving tips (80C, ELSS, NPS)\n\n` +
        `*To unlock GPT-4 powered advice, add your* \`OPENAI_API_KEY\` *to the backend* \`.env\` *file.*`;
};
const chatWithAI = async (messages, financialContext, model = 'gpt-4o-mini') => {
    if (!env_1.default.OPENAI_API_KEY) {
        return {
            content: getSmartLocalResponse(messages, financialContext),
            tokens: 0
        };
    }
    try {
        const topCatLines = financialContext.topCategories && financialContext.topCategories.length > 0
            ? financialContext.topCategories.map((c, i) => `  ${i + 1}. ${c.name}: ₹${c.total.toLocaleString('en-IN')}`).join('\n')
            : '  (no expense data this month)';
        const contextMessage = `
Current Financial Summary:
- Monthly Income: ₹${financialContext.totalIncome?.toLocaleString('en-IN') ?? 'N/A'}
- Monthly Expenses: ₹${financialContext.totalExpenses?.toLocaleString('en-IN') ?? 'N/A'}
- Total Savings: ₹${financialContext.totalSavings?.toLocaleString('en-IN') ?? 'N/A'}
- Total Investments: ₹${financialContext.totalInvestments?.toLocaleString('en-IN') ?? 'N/A'}
- Bank Account Balance: ₹${financialContext.bankBalance?.toLocaleString('en-IN') ?? '0'}
- Net Worth: ₹${financialContext.netWorth?.toLocaleString('en-IN') ?? 'N/A'}
- Top Expense Categories This Month:
${topCatLines}
    `.trim();
        const response = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'system', content: `User's Financial Context:\n${contextMessage}` },
                ...messages,
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });
        const content = response.choices[0]?.message?.content || 'I apologize, I could not generate a response.';
        const tokens = response.usage?.total_tokens || 0;
        return { content, tokens };
    }
    catch (error) {
        logger_1.default.error('OpenAI API error:', error);
        if (error.status === 429) {
            throw new errors_1.AppError('AI service rate limit exceeded. Please try again later.', 429);
        }
        throw new errors_1.AppError('AI service temporarily unavailable', 503);
    }
};
exports.chatWithAI = chatWithAI;
const generateFinancialInsights = async (context) => {
    if (!env_1.default.OPENAI_API_KEY)
        return '';
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Based on this financial data, provide 3 specific actionable insights in a JSON array format:
Income: ₹${context.totalIncome}, Expenses: ₹${context.totalExpenses}, Savings: ₹${context.totalSavings}, Investments: ₹${context.totalInvestments}
Format: [{"insight": "...", "type": "warning|success|tip", "action": "..."}]`,
                },
            ],
            max_tokens: 500,
            temperature: 0.6,
            response_format: { type: 'json_object' },
        });
        return response.choices[0]?.message?.content || '{"insights": []}';
    }
    catch (error) {
        logger_1.default.error('AI insights error:', error);
        return '{"insights": []}';
    }
};
exports.generateFinancialInsights = generateFinancialInsights;
const analyzeReceiptWithAI = async (imageUrl) => {
    if (!env_1.default.OPENAI_API_KEY)
        return {};
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'Analyze this receipt and extract: merchant name, total amount, date, items (name, price, quantity), tax amount. Return as JSON with keys: merchant, amount, date, items, tax, currency.',
                        },
                        { type: 'image_url', image_url: { url: imageUrl } },
                    ],
                },
            ],
            max_tokens: 500,
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0]?.message?.content || '{}';
        return JSON.parse(content);
    }
    catch (error) {
        logger_1.default.error('Receipt OCR error:', error);
        return {};
    }
};
exports.analyzeReceiptWithAI = analyzeReceiptWithAI;
const getLocalInvestmentAdvice = (ctx) => {
    const surplus = (ctx.totalIncome || 0) - (ctx.totalExpenses || 0);
    if (surplus <= 0)
        return [];
    const cards = [];
    // Emergency fund first
    const emergencyTarget = (ctx.totalExpenses || 0) * 6;
    if ((ctx.totalSavings || 0) < emergencyTarget) {
        cards.push({
            type: 'Liquid Fund',
            name: 'Emergency Fund (Liquid MF)',
            suggestedMonthlyAmount: Math.round(surplus * 0.3),
            risk: 'Low',
            expectedReturn: '6-7% p.a.',
            rationale: `You need ~₹${Math.round(emergencyTarget).toLocaleString('en-IN')} as 6-month emergency reserve. Liquid funds are instant-redeem and safe.`,
            action: 'Open SIP on Groww or Zerodha',
            icon: '🛡️',
        });
    }
    // Equity SIP
    if (surplus >= 2000) {
        cards.push({
            type: 'Equity SIP',
            name: 'Nifty 50 Index Fund',
            suggestedMonthlyAmount: Math.round(surplus * 0.4),
            risk: 'Medium',
            expectedReturn: '12-14% p.a. (10yr avg)',
            rationale: 'Index funds mirror market performance at low cost. Best long-term wealth builder for salaried individuals.',
            action: 'Start SIP via Groww, Zerodha Coin, or Paytm Money',
            icon: '📈',
        });
    }
    // ELSS Tax saving
    if (surplus >= 3000) {
        cards.push({
            type: 'ELSS',
            name: 'ELSS Tax-Saver Fund',
            suggestedMonthlyAmount: Math.round(Math.min(surplus * 0.15, 12500)),
            risk: 'Medium',
            expectedReturn: '12-15% + ₹1.5L 80C deduction',
            rationale: 'ELSS saves up to ₹46,800 in taxes u/s 80C while generating equity-level returns. Mandatory 3yr lock-in.',
            action: 'Invest via Mirae Asset or Axis ELSS',
            icon: '💰',
        });
    }
    // Gold
    if (surplus >= 5000) {
        cards.push({
            type: 'Gold ETF',
            name: 'Sovereign Gold Bond / Gold ETF',
            suggestedMonthlyAmount: Math.round(surplus * 0.1),
            risk: 'Low',
            expectedReturn: '8-10% p.a. + 2.5% interest (SGB)',
            rationale: 'Gold hedges against inflation and currency risk. Ideal 5-10% portfolio allocation.',
            action: 'Buy Gold ETF on NSE or apply for SGB via bank',
            icon: '🪙',
        });
    }
    return cards;
};
const generateInvestmentAdvice = async (context) => {
    const surplus = (context.totalIncome || 0) - (context.totalExpenses || 0);
    if (!env_1.default.OPENAI_API_KEY) {
        return getLocalInvestmentAdvice(context);
    }
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Based on this Indian user's finances, suggest 3-4 investment options in JSON array format:
Monthly Surplus: ₹${surplus}
Existing Investments: ₹${context.totalInvestments}
Savings: ₹${context.totalSavings}
Format: [{"type":"...","name":"...","suggestedMonthlyAmount":number,"risk":"Low|Medium|High","expectedReturn":"...","rationale":"...","action":"...","icon":"emoji"}]`,
                },
            ],
            max_tokens: 800,
            temperature: 0.5,
            response_format: { type: 'json_object' },
        });
        const content = response.choices[0]?.message?.content || '{"advice":[]}';
        const parsed = JSON.parse(content);
        return parsed.advice || parsed || getLocalInvestmentAdvice(context);
    }
    catch (error) {
        logger_1.default.error('Investment advice AI error:', error);
        return getLocalInvestmentAdvice(context);
    }
};
exports.generateInvestmentAdvice = generateInvestmentAdvice;
//# sourceMappingURL=aiService.js.map
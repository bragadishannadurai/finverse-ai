export interface FinancialContext {
    totalIncome?: number;
    totalExpenses?: number;
    totalSavings?: number;
    totalInvestments?: number;
    netWorth?: number;
    bankBalance?: number;
    monthlyData?: unknown;
    topCategories?: Array<{
        name: string;
        total: number;
    }>;
    budgets?: unknown;
    savingsGoals?: unknown;
}
export declare const chatWithAI: (messages: Array<{
    role: "user" | "assistant";
    content: string;
}>, financialContext: FinancialContext, model?: string) => Promise<{
    content: string;
    tokens: number;
}>;
export declare const generateFinancialInsights: (context: FinancialContext) => Promise<string>;
export declare const analyzeReceiptWithAI: (imageUrl: string) => Promise<Record<string, unknown>>;
export interface InvestmentAdviceCard {
    type: string;
    name: string;
    suggestedMonthlyAmount: number;
    risk: 'Low' | 'Medium' | 'High';
    expectedReturn: string;
    rationale: string;
    action: string;
    icon: string;
}
export declare const generateInvestmentAdvice: (context: FinancialContext) => Promise<InvestmentAdviceCard[]>;
//# sourceMappingURL=aiService.d.ts.map
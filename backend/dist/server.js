"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const database_1 = require("./config/database");
const redis_1 = require("./config/redis");
const errorHandler_1 = require("./middleware/errorHandler");
const socketManager_1 = require("./sockets/socketManager");
const cronJobs_1 = require("./jobs/cronJobs");
const logger_1 = __importDefault(require("./utils/logger"));
const env_1 = __importDefault(require("./config/env"));
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const expenses_1 = __importDefault(require("./routes/expenses"));
const income_1 = __importDefault(require("./routes/income"));
const budgets_1 = __importDefault(require("./routes/budgets"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const ai_1 = __importDefault(require("./routes/ai"));
const categories_1 = __importDefault(require("./routes/categories"));
const investments_1 = __importDefault(require("./routes/investments"));
const savings_1 = __importDefault(require("./routes/savings"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const settings_1 = __importDefault(require("./routes/settings"));
const bank_accounts_1 = __importDefault(require("./routes/bank-accounts"));
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// ─── Security Middleware ──────────────────────────────────────────────────────
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
const allowedOrigins = [
    env_1.default.CLIENT_URL,
    'http://localhost',
    'capacitor://localhost',
    'http://localhost:3000'
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = (0, express_rate_limit_1.default)({
    windowMs: env_1.default.RATE_LIMIT_WINDOW_MS,
    max: env_1.default.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
    },
    skip: (req) => req.method === 'OPTIONS',
});
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    message: {
        success: false,
        message: 'Too many auth attempts, please try again later.',
    },
});
app.use('/api/', limiter);
// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)(env_1.default.COOKIE_SECRET));
app.use((0, compression_1.default)());
// ─── Logging ──────────────────────────────────────────────────────────────────
if (env_1.default.NODE_ENV !== 'test') {
    app.use((0, morgan_1.default)('combined', {
        stream: {
            write: (message) => logger_1.default.info(message.trim()),
        },
    }));
}
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'FinVerse AI API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: env_1.default.NODE_ENV,
    });
});
// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, auth_1.default);
app.use('/api/users', user_1.default);
app.use('/api/expenses', expenses_1.default);
app.use('/api/income', income_1.default);
app.use('/api/budgets', budgets_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/categories', categories_1.default);
app.use('/api/investments', investments_1.default);
app.use('/api/savings', savings_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/bank-accounts', bank_accounts_1.default);
// ─── 404 & Error Handlers ────────────────────────────────────────────────────
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
// ─── Socket.IO ────────────────────────────────────────────────────────────────
(0, socketManager_1.initSocket)(server);
// ─── Start Server ─────────────────────────────────────────────────────────────
const start = async () => {
    await (0, database_1.connectDB)();
    await (0, redis_1.connectRedis)();
    (0, cronJobs_1.scheduleCronJobs)();
    server.listen(env_1.default.PORT, () => {
        logger_1.default.info(`🚀 FinVerse AI server running on port ${env_1.default.PORT} [${env_1.default.NODE_ENV}]`);
    });
};
// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
    logger_1.default.info(`${signal} received — shutting down gracefully`);
    server.close(() => {
        logger_1.default.info('HTTP server closed');
        process.exit(0);
    });
    // Force close after 10s
    setTimeout(() => {
        logger_1.default.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_1.default.error('Unhandled Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    logger_1.default.error('Uncaught Exception:', error);
    process.exit(1);
});
start().catch((err) => {
    logger_1.default.error('Failed to start server:', err);
    process.exit(1);
});
//# sourceMappingURL=server.js.map
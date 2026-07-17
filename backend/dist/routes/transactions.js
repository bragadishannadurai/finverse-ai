"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transactionController_1 = require("../controllers/transactionController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', transactionController_1.getTransactions);
router.get('/stats', transactionController_1.getTransactionStats);
router.get('/:id', transactionController_1.getTransaction);
exports.default = router;
//# sourceMappingURL=transactions.js.map
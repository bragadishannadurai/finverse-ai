"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenseController_1 = require("../controllers/expenseController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', expenseController_1.getExpenses);
router.post('/', expenseController_1.createExpense);
router.get('/stats/summary', expenseController_1.getExpenseSummary);
router.get('/:id', expenseController_1.getExpense);
router.put('/:id', expenseController_1.updateExpense);
router.delete('/:id', expenseController_1.deleteExpense);
router.post('/:id/receipt', upload_1.uploadDocument.single('receipt'), expenseController_1.uploadExpenseReceipt);
exports.default = router;
//# sourceMappingURL=expenses.js.map
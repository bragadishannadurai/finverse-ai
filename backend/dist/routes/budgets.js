"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const budgetController_1 = require("../controllers/budgetController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', budgetController_1.getBudgets);
router.post('/', budgetController_1.createBudget);
router.get('/history', budgetController_1.getBudgetHistory);
router.post('/sync', budgetController_1.syncBudgetSpending);
router.get('/:id', budgetController_1.getBudget);
router.put('/:id', budgetController_1.updateBudget);
router.delete('/:id', budgetController_1.deleteBudget);
router.patch('/:id/archive', budgetController_1.archiveBudget);
exports.default = router;
//# sourceMappingURL=budgets.js.map
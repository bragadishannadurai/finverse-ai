"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const incomeController_1 = require("../controllers/incomeController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', incomeController_1.getIncomes);
router.post('/', incomeController_1.createIncome);
router.get('/stats/summary', incomeController_1.getIncomeSummary);
router.get('/:id', incomeController_1.getIncome);
router.put('/:id', incomeController_1.updateIncome);
router.delete('/:id', incomeController_1.deleteIncome);
exports.default = router;
//# sourceMappingURL=income.js.map
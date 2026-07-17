"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const savingsController_1 = require("../controllers/savingsController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', savingsController_1.getSavingsGoals);
router.post('/', savingsController_1.createSavingsGoal);
router.get('/history', savingsController_1.getSavingsHistory);
router.get('/:id', savingsController_1.getSavingsGoal);
router.put('/:id', savingsController_1.updateSavingsGoal);
router.delete('/:id', savingsController_1.deleteSavingsGoal);
router.post('/:id/contribute', savingsController_1.contributeToGoal);
router.post('/:id/auto-pay', savingsController_1.configureAutoSave);
router.post('/:id/pay-now', savingsController_1.savingsPayNow);
exports.default = router;
//# sourceMappingURL=savings.js.map
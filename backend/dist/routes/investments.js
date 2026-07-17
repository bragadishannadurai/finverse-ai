"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const investmentController_1 = require("../controllers/investmentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', investmentController_1.getInvestments);
router.post('/', investmentController_1.createInvestment);
router.get('/summary', investmentController_1.getInvestmentSummary);
router.get('/history', investmentController_1.getInvestmentHistory);
router.get('/:id', investmentController_1.getInvestment);
router.put('/:id', investmentController_1.updateInvestment);
router.delete('/:id', investmentController_1.deleteInvestment);
router.patch('/:id/archive', investmentController_1.archiveInvestment);
router.post('/:id/auto-pay', investmentController_1.configureAutoPay);
router.post('/:id/pay-now', investmentController_1.payNow);
exports.default = router;
//# sourceMappingURL=investments.js.map
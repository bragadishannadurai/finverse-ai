"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bankAccountController_1 = require("../controllers/bankAccountController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', bankAccountController_1.getBankAccounts);
router.post('/', bankAccountController_1.createBankAccount);
router.get('/:id', bankAccountController_1.getBankAccount);
router.put('/:id', bankAccountController_1.updateBankAccount);
router.delete('/:id', bankAccountController_1.deleteBankAccount);
router.get('/:id/transactions', bankAccountController_1.getAccountTransactions);
router.post('/:id/deposit', bankAccountController_1.depositToAccount);
router.post('/:id/withdraw', bankAccountController_1.withdrawFromAccount);
router.post('/:id/set-default', bankAccountController_1.setDefaultAccount);
exports.default = router;
//# sourceMappingURL=bank-accounts.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/chats', aiController_1.getChats);
router.post('/chats', aiController_1.createChat);
router.get('/insights', aiController_1.getInsights);
router.get('/chats/:id', aiController_1.getChat);
router.post('/chats/:id/message', aiController_1.sendMessage);
router.delete('/chats/:id', aiController_1.deleteChat);
router.get('/investment-advice', aiController_1.getInvestmentAdvice);
exports.default = router;
//# sourceMappingURL=ai.js.map
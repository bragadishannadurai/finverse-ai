"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/profile', userController_1.getProfile);
router.put('/profile', userController_1.updateProfile);
router.get('/activity', userController_1.getActivityLog);
exports.default = router;
//# sourceMappingURL=user.js.map
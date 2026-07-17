"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/', settingsController_1.getSettings);
router.put('/', settingsController_1.updateSettings);
router.put('/profile', settingsController_1.updateProfile);
router.post('/avatar', upload_1.uploadAvatar.single('avatar'), settingsController_1.uploadUserAvatar);
router.delete('/account', settingsController_1.deleteAccount);
exports.default = router;
//# sourceMappingURL=settings.js.map
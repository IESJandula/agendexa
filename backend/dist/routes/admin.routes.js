"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Only Superadmins can access these routes
router.use(auth_middleware_1.authenticateToken);
router.use((0, auth_middleware_1.requireRole)(['SUPERADMIN']));
router.post('/businesses', admin_controller_1.createBusiness);
router.get('/businesses', admin_controller_1.getBusinesses);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staff_controller_1 = require("../controllers/staff.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticateToken);
// Owner and Superadmin endpoints
router.get('/', (0, auth_middleware_1.requireRole)(['OWNER', 'SUPERADMIN']), staff_controller_1.getStaff);
router.post('/', (0, auth_middleware_1.requireRole)(['OWNER', 'SUPERADMIN']), staff_controller_1.createStaff);
router.patch('/:id', (0, auth_middleware_1.requireRole)(['OWNER', 'SUPERADMIN']), staff_controller_1.updateStaff);
// Owner, Staff and Superadmin endpoints
router.get('/me', (0, auth_middleware_1.requireRole)(['OWNER', 'STAFF', 'SUPERADMIN']), staff_controller_1.getMe);
router.patch('/:id/schedule', (0, auth_middleware_1.requireRole)(['OWNER', 'STAFF', 'SUPERADMIN']), staff_controller_1.updateSchedule);
router.post('/:id/time-offs', (0, auth_middleware_1.requireRole)(['OWNER', 'STAFF', 'SUPERADMIN']), staff_controller_1.addTimeOff);
exports.default = router;

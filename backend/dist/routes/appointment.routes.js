"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appointment_controller_1 = require("../controllers/appointment.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// OWNER, STAFF, CLIENT and SUPERADMIN can manage appointments
router.use(auth_middleware_1.authenticateToken);
router.use((0, auth_middleware_1.requireRole)(['OWNER', 'STAFF', 'CLIENT', 'SUPERADMIN']));
router.get('/', appointment_controller_1.getAppointments);
router.patch('/:id/status', appointment_controller_1.updateAppointmentStatus);
exports.default = router;

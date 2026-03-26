"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const public_controller_1 = require("../controllers/public.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// General endpoints
router.get('/businesses/search', public_controller_1.searchBusinesses);
router.get('/appointments/confirm', public_controller_1.confirmAppointmentByToken);
// Slug-specific endpoints
router.get('/:slug/services', public_controller_1.getPublicServices);
router.get('/:slug/staff', public_controller_1.getPublicStaff);
router.get('/:slug/availability', public_controller_1.getAvailability);
router.get('/:slug/availability/month', public_controller_1.getMonthlyAvailability);
router.post('/:slug/book', auth_middleware_1.authenticateToken, (0, auth_middleware_1.requireRole)(['CLIENT', 'OWNER', 'STAFF', 'SUPERADMIN']), public_controller_1.bookAppointment);
exports.default = router;

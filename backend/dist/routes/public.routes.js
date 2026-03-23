"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const public_controller_1 = require("../controllers/public.controller");
const router = (0, express_1.Router)();
// General endpoints
router.get('/businesses/search', public_controller_1.searchBusinesses);
// Slug-specific endpoints
router.get('/:slug/services', public_controller_1.getPublicServices);
router.get('/:slug/staff', public_controller_1.getPublicStaff);
router.get('/:slug/availability', public_controller_1.getAvailability);
router.get('/:slug/availability/month', public_controller_1.getMonthlyAvailability);
router.post('/:slug/book', public_controller_1.bookAppointment);
exports.default = router;

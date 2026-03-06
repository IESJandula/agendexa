import { Router } from 'express';
import { getPublicServices, getPublicStaff, getAvailability, getMonthlyAvailability, bookAppointment, searchBusinesses } from '../controllers/public.controller';

const router = Router();

// General endpoints
router.get('/businesses/search', searchBusinesses);

// Slug-specific endpoints
router.get('/:slug/services', getPublicServices);
router.get('/:slug/staff', getPublicStaff);
router.get('/:slug/availability', getAvailability);
router.get('/:slug/availability/month', getMonthlyAvailability);
router.post('/:slug/book', bookAppointment);

export default router;

import { Router } from 'express';
import { getPublicServices, getPublicStaff, getAvailability, getMonthlyAvailability, bookAppointment, searchBusinesses, confirmAppointmentByToken } from '../controllers/public.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// General endpoints
router.get('/businesses/search', searchBusinesses);
router.get('/appointments/confirm', confirmAppointmentByToken);

// Slug-specific endpoints
router.get('/:slug/services', getPublicServices);
router.get('/:slug/staff', getPublicStaff);
router.get('/:slug/availability', getAvailability);
router.get('/:slug/availability/month', getMonthlyAvailability);
router.post('/:slug/book', authenticateToken, requireRole(['CLIENT', 'OWNER', 'STAFF', 'SUPERADMIN']), bookAppointment);

export default router;

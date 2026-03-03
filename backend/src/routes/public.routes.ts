import { Router } from 'express';
import { getPublicServices, getPublicStaff, getAvailability, getMonthlyAvailability, bookAppointment } from '../controllers/public.controller';

const router = Router();

router.get('/:slug/services', getPublicServices);
router.get('/:slug/staff', getPublicStaff);
router.get('/:slug/availability', getAvailability);
router.get('/:slug/availability/month', getMonthlyAvailability);
router.post('/:slug/book', bookAppointment);

export default router;

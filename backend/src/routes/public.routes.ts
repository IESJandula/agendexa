import { Router } from 'express';
import { getPublicServices, getPublicStaff, getAvailability, bookAppointment } from '../controllers/public.controller';

const router = Router();

router.get('/:slug/services', getPublicServices);
router.get('/:slug/staff', getPublicStaff);
router.get('/:slug/availability', getAvailability);
router.post('/:slug/book', bookAppointment);

export default router;

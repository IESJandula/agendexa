import { Router } from 'express';
import { getAppointments, updateAppointmentStatus } from '../controllers/appointment.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Both OWNER and STAFF can manage appointments
router.use(authenticateToken);
router.use(requireRole(['OWNER', 'STAFF']));

router.get('/', getAppointments);
router.patch('/:id/status', updateAppointmentStatus);

export default router;

import { Router } from 'express';
import { getAppointments, updateAppointmentStatus } from '../controllers/appointment.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// OWNER, STAFF, CLIENT and SUPERADMIN can manage appointments
router.use(authenticateToken);
router.use(requireRole(['OWNER', 'STAFF', 'CLIENT', 'SUPERADMIN']));

router.get('/', getAppointments);
router.patch('/:id/status', updateAppointmentStatus);

export default router;

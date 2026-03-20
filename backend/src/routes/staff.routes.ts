import { Router } from 'express';
import { getStaff, getMe, createStaff, updateStaff, updateSchedule, addTimeOff } from '../controllers/staff.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Owner and Superadmin endpoints
router.get('/', requireRole(['OWNER', 'SUPERADMIN']), getStaff);
router.post('/', requireRole(['OWNER', 'SUPERADMIN']), createStaff);
router.patch('/:id', requireRole(['OWNER', 'SUPERADMIN']), updateStaff);

// Owner, Staff and Superadmin endpoints
router.get('/me', requireRole(['OWNER', 'STAFF', 'SUPERADMIN']), getMe);
router.patch('/:id/schedule', requireRole(['OWNER', 'STAFF', 'SUPERADMIN']), updateSchedule);
router.post('/:id/time-offs', requireRole(['OWNER', 'STAFF', 'SUPERADMIN']), addTimeOff);

export default router;

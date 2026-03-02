import { Router } from 'express';
import { getStaff, getMe, createStaff, updateStaff, updateSchedule, addTimeOff } from '../controllers/staff.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

router.use(authenticateToken);

// Owner only endpoints
router.get('/', requireRole(['OWNER']), getStaff);
router.post('/', requireRole(['OWNER']), createStaff);
router.patch('/:id', requireRole(['OWNER']), updateStaff);

// Owner and Staff endpoints
router.get('/me', requireRole(['OWNER', 'STAFF']), getMe);
router.patch('/:id/schedule', requireRole(['OWNER', 'STAFF']), updateSchedule);
router.post('/:id/time-offs', requireRole(['OWNER', 'STAFF']), addTimeOff);

export default router;

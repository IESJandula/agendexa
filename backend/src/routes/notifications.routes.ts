import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { getNotifications, markNotificationRead } from '../controllers/notifications.controller';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['CLIENT']));

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);

export default router;

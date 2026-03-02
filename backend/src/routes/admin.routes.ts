import { Router } from 'express';
import { createBusiness, getBusinesses } from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only Superadmins can access these routes
router.use(authenticateToken);
router.use(requireRole(['SUPERADMIN']));

router.post('/businesses', createBusiness);
router.get('/businesses', getBusinesses);

export default router;

import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { getSanctionSettings, updateSanctionSettings, getSanctionClients } from '../controllers/sanctions.controller';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['OWNER', 'STAFF', 'SUPERADMIN']));

router.get('/settings', getSanctionSettings);
router.patch('/settings', updateSanctionSettings);
router.get('/clients', getSanctionClients);

export default router;

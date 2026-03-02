import { Router } from 'express';
import { getServices, createService, updateService, deleteService } from '../controllers/service.controller';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Only OWNER can manage services
router.use(authenticateToken);
router.use(requireRole(['OWNER']));

router.get('/', getServices);
router.post('/', createService);
router.patch('/:id', updateService);
router.delete('/:id', deleteService);

export default router;

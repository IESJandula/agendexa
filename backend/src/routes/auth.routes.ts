import { Router } from 'express';
import { login, registerClient } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);
router.post('/register/client', registerClient);

export default router;

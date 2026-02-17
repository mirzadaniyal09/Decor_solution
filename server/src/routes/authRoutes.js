import { Router } from 'express';
import { forgotPassword, login, me, register, resetPassword } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, me);

export default router;

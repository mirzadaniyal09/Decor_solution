import { Router } from 'express';
import { adminUpdateOrderStatus, createOrder, listAllOrders } from '../controllers/orderController.js';
import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// Admin: list all customer orders
router.get('/admin', requireAuth, requireRole('admin'), listAllOrders);

// Admin: update status
router.put('/admin/:id/status', requireAuth, requireRole('admin'), adminUpdateOrderStatus);

router.post('/', createOrder);

export default router;

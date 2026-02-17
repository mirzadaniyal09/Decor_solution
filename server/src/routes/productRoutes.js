import { Router } from 'express';
import {
	addProductReview,
	createProduct,
	deleteProductReview,
	deleteProduct,
	getProductById,
	getProductBySlug,
	listWatchBuy,
	listProducts,
	updateProduct,
} from '../controllers/productController.js';
import { optionalAuth, requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { reviewPhotoUpload } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.get('/', listProducts);

router.get('/watch-buy', listWatchBuy);

router.get('/admin/:id([0-9a-fA-F]{24})', requireAuth, requireRole('admin'), getProductById);
router.put('/admin/:id([0-9a-fA-F]{24})', requireAuth, requireRole('admin'), updateProduct);
router.delete('/admin/:id([0-9a-fA-F]{24})', requireAuth, requireRole('admin'), deleteProduct);

router.post('/:id([0-9a-fA-F]{24})/reviews', optionalAuth, reviewPhotoUpload.array('photos', 5), addProductReview);
router.delete('/:id([0-9a-fA-F]{24})/reviews/:reviewId([0-9a-fA-F]{24})', requireAuth, deleteProductReview);

router.get('/:slug', getProductBySlug);

router.post('/', requireAuth, requireRole('admin'), createProduct);

export default router;

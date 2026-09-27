import { Router } from 'express';
import { handleUpload } from '@vercel/blob/client';

import { optionalAuth, requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { productMediaUpload } from '../middlewares/uploadMiddleware.js';

const router = Router();

router.post('/blob-token', optionalAuth, async (req, res, next) => {
    try {
        const result = await handleUpload({
            request: req,
            body: req.body,
            onBeforeGenerateToken: async (_pathname, clientPayload) => {
                const purpose = String(clientPayload || '');
                const isReview = purpose === 'review';
                if (!isReview && req.user?.role !== 'admin') {
                    res.status(403);
                    throw new Error('Admin access required');
                }

                return {
                    allowedContentTypes: isReview
                        ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
                        : ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'],
                    maximumSizeInBytes: isReview ? 5 * 1024 * 1024 : 50 * 1024 * 1024,
                    addRandomSuffix: true,
                };
            },
        });
        res.json(result);
    } catch (error) {
        next(error);
    }
});

router.post('/product-media', requireAuth, requireRole('admin'), productMediaUpload.array('files', 10), (req, res) => {
    const files = Array.isArray(req.files) ? req.files : [];
    res.status(201).json({
        files: files
            .map((f) => {
                const mimetype = String(f?.mimetype || '');
                const type = mimetype.startsWith('video/') ? 'video' : 'image';
                const filename = f?.filename ? String(f.filename) : '';
                return filename
                    ? {
                        url: `/api/uploads/${filename}`,
                        type,
                        originalName: f?.originalname || '',
                        mime: mimetype,
                        size: Number(f?.size || 0),
                    }
                    : null;
            })
            .filter(Boolean),
    });
});

export default router;

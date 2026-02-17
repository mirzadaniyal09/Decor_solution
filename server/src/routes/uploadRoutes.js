import { Router } from 'express';

import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { productMediaUpload } from '../middlewares/uploadMiddleware.js';

const router = Router();

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

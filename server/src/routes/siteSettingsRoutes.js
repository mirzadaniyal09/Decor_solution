import { Router } from 'express';
import asyncHandler from 'express-async-handler';

import { requireAuth, requireRole } from '../middlewares/authMiddleware.js';
import { SiteSettings } from '../models/SiteSettings.js';

const router = Router();

async function getSingleton() {
    const doc = await SiteSettings.findOne();
    if (doc) return doc;
    return SiteSettings.create({});
}

router.get(
    '/',
    asyncHandler(async (req, res) => {
        const doc = await getSingleton();
        res.json({
            heroBannerUrl: doc.heroBannerUrl || '',
            heroSlides: Array.isArray(doc.heroSlides) ? doc.heroSlides : [],
            collectionImages: Array.isArray(doc.collectionImages) ? doc.collectionImages : [],
        });
    })
);

router.put(
    '/',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req, res) => {
        const raw = req.body?.heroBannerUrl;
        const heroBannerUrl = typeof raw === 'string' ? raw.trim() : '';

        const rawSlides = req.body?.heroSlides;
        const incomingSlides = Array.isArray(rawSlides) ? rawSlides : null;

        const rawCollections = req.body?.collectionImages;
        const incomingCollections = Array.isArray(rawCollections) ? rawCollections : null;

        if (heroBannerUrl && !heroBannerUrl.startsWith('/api/uploads/')) {
            res.status(400);
            throw new Error('heroBannerUrl must be an uploaded file URL');
        }

        if (incomingSlides) {
            for (const s of incomingSlides) {
                const imageUrl = typeof s?.imageUrl === 'string' ? s.imageUrl.trim() : '';
                if (imageUrl && !imageUrl.startsWith('/api/uploads/')) {
                    res.status(400);
                    throw new Error('heroSlides.imageUrl must be an uploaded file URL');
                }
            }
        }

        if (incomingCollections) {
            for (const c of incomingCollections) {
                const imageUrl = typeof c?.imageUrl === 'string' ? c.imageUrl.trim() : '';
                if (imageUrl && !imageUrl.startsWith('/api/uploads/')) {
                    res.status(400);
                    throw new Error('collectionImages.imageUrl must be an uploaded file URL');
                }
            }
        }

        const doc = await getSingleton();

        // Only update fields that were provided.
        if (typeof req.body?.heroBannerUrl !== 'undefined') {
            doc.heroBannerUrl = heroBannerUrl;
        }

        if (incomingSlides) {
            doc.heroSlides = incomingSlides
                .filter(Boolean)
                .map((s) => ({
                    id: typeof s?.id === 'string' ? s.id.trim() : '',
                    imageUrl: typeof s?.imageUrl === 'string' ? s.imageUrl.trim() : '',
                    eyebrow: typeof s?.eyebrow === 'string' ? s.eyebrow.trim() : '',
                    title: typeof s?.title === 'string' ? s.title.trim() : '',
                    subtitle: typeof s?.subtitle === 'string' ? s.subtitle.trim() : '',
                    ctaLabel: typeof s?.ctaLabel === 'string' ? s.ctaLabel.trim() : '',
                    ctaTo: typeof s?.ctaTo === 'string' ? s.ctaTo.trim() : '',
                }));
        }

        if (incomingCollections) {
            doc.collectionImages = incomingCollections
                .filter(Boolean)
                .map((c) => ({
                    id: typeof c?.id === 'string' ? c.id.trim() : '',
                    imageUrl: typeof c?.imageUrl === 'string' ? c.imageUrl.trim() : '',
                }));
        }
        await doc.save();

        res.json({
            heroBannerUrl: doc.heroBannerUrl || '',
            heroSlides: Array.isArray(doc.heroSlides) ? doc.heroSlides : [],
            collectionImages: Array.isArray(doc.collectionImages) ? doc.collectionImages : [],
        });
    })
);

export default router;

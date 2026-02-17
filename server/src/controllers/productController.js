import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';

import { Product } from '../models/Product.js';
import { slugify } from '../utils/slugify.js';

const ALLOWED_CATEGORIES = ['New Arrivals', 'Offers', 'Top Sellers', 'Limited Edition'];
const DEFAULT_CATEGORY = ALLOWED_CATEGORIES[0];

const dataOrUrl = z
    .string()
    .min(1)
    .refine((val) => {
        const v = String(val || '');
        return v.startsWith('data:') || /^https?:\/\//i.test(v) || v.startsWith('/api/uploads/');
    }, {
        message: 'Must be a data URI, URL, or /api/uploads/* path',
    });

const createSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    price: z.number().nonnegative(),
    compareAtPrice: z.number().nonnegative().optional(),
    currency: z.string().optional(),
    images: z.array(dataOrUrl).optional(),
    colors: z
        .array(
            z.object({
                name: z.string().min(1),
                hex: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
                qty: z.number().int().nonnegative().optional(),
                media: z
                    .array(
                        z.object({
                            type: z.enum(['image', 'video']).default('image'),
                            src: dataOrUrl,
                        })
                    )
                    .optional(),
            })
        )
        .optional(),
    category: z.enum(ALLOWED_CATEGORIES).optional(),
    tags: z.array(z.string()).optional(),
    inStock: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const reviewSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
});

function computeReviewStats(reviews) {
    const list = Array.isArray(reviews) ? reviews : [];
    const count = list.length;
    const sum = list.reduce((acc, r) => acc + Number(r?.rating || 0), 0);
    const avg = count ? sum / count : 0;
    return {
        ratingCount: count,
        ratingAvg: Math.round(avg * 10) / 10,
        latestReview: count
            ? (() => {
                const latest = [...list].sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0))[0];
                return {
                    name: latest?.name,
                    rating: latest?.rating,
                    comment: latest?.comment,
                    createdAt: latest?.createdAt,
                };
            })()
            : undefined,
    };
}

function pickFirstColorVideoSrc(product) {
    const colors = Array.isArray(product?.colors) ? product.colors : [];
    const first = colors[0];
    const media = Array.isArray(first?.media) ? first.media : [];
    for (const item of media) {
        if (item?.type === 'video' && typeof item?.src === 'string' && item.src.trim()) {
            return item.src.trim();
        }
    }
    return '';
}

function pickPosterSrc(product) {
    const images = Array.isArray(product?.images) ? product.images : [];
    const firstImage = images.find((s) => typeof s === 'string' && s.trim());
    if (firstImage) return firstImage.trim();

    const colors = Array.isArray(product?.colors) ? product.colors : [];
    for (const color of colors) {
        const media = Array.isArray(color?.media) ? color.media : [];
        for (const item of media) {
            if (item?.type === 'image' && typeof item?.src === 'string' && item.src.trim()) {
                return item.src.trim();
            }
        }
    }

    return '';
}

export const listWatchBuy = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(48, Math.max(1, Number(req.query.limit || 12)));
    const sortKey = String(req.query.sort || 'new').trim().toLowerCase();

    const sortBy = sortKey === 'new' ? { createdAt: -1 } : { createdAt: -1 };

    const [items, total] = await Promise.all([
        Product.find({})
            .select('title slug images colors')
            .sort(sortBy)
            .skip((page - 1) * limit)
            .limit(limit),
        Product.countDocuments({}),
    ]);

    const out = items
        .map((p) => {
            const videoSrc = pickFirstColorVideoSrc(p);
            if (!videoSrc || String(videoSrc).startsWith('data:')) return null;
            return {
                _id: p._id,
                title: p.title,
                slug: p.slug,
                videoSrc,
                poster: pickPosterSrc(p),
            };
        })
        .filter(Boolean);

    res.json({ items: out, page, limit, total, pages: Math.ceil(total / limit) });
});

export const listProducts = asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(48, Math.max(1, Number(req.query.limit || 12)));
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || '').trim();
    const tag = String(req.query.tag || '').trim();
    const sort = String(req.query.sort || '').trim();

    const filter = {};
    if (category) filter.category = category;
    if (q) filter.$text = { $search: q };
    if (tag) {
        const tags = tag
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        if (tags.length === 1) filter.tags = { $in: tags };
        if (tags.length > 1) filter.tags = { $all: tags };
    }

    const sortKey = sort.toLowerCase();
    const sortBy =
        sortKey === 'new'
            ? { createdAt: -1 }
            : sortKey === 'rating' || sortKey === 'top-rated' || sortKey === 'highly-rated'
                ? { ratingAvg: -1, ratingCount: -1, createdAt: -1 }
                : { createdAt: -1 };

    const [items, total] = await Promise.all([
        Product.find(filter)
            .select('-reviews')
            .sort(sortBy)
            .skip((page - 1) * limit)
            .limit(limit),
        Product.countDocuments(filter),
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
});

export const addProductReview = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const data = reviewSchema.parse(req.body);

    const product = await Product.findById(id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const photos = files
        .map((f) => (f?.filename ? `/api/uploads/${f.filename}` : ''))
        .filter(Boolean);

    const review = {
        userId: req.user?._id || null,
        name: (data.name || 'Anonymous').trim() || 'Anonymous',
        rating: data.rating,
        comment: (data.comment || '').trim(),
        photos,
        createdAt: new Date(),
    };

    product.reviews = Array.isArray(product.reviews) ? product.reviews : [];
    product.reviews.push(review);

    const stats = computeReviewStats(product.reviews);
    product.ratingCount = stats.ratingCount;
    product.ratingAvg = stats.ratingAvg;
    product.latestReview = stats.latestReview;

    const saved = await product.save();
    res.status(201).json({
        ratingAvg: saved.ratingAvg,
        ratingCount: saved.ratingCount,
        latestReview: saved.latestReview,
    });
});

export const deleteProductReview = asyncHandler(async (req, res) => {
    const { id, reviewId } = req.params;

    const product = await Product.findById(id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    const review = product.reviews?.id(reviewId);
    if (!review) {
        res.status(404);
        throw new Error('Review not found');
    }

    const isAdmin = req.user?.role === 'admin';
    const ownerId = review.userId ? String(review.userId) : '';
    const actorId = req.user?._id ? String(req.user._id) : '';
    const isOwner = ownerId && actorId && ownerId === actorId;

    if (!isAdmin && !isOwner) {
        res.status(403);
        throw new Error('Forbidden');
    }

    const photos = Array.isArray(review.photos) ? review.photos : [];

    review.deleteOne();

    const stats = computeReviewStats(product.reviews);
    product.ratingCount = stats.ratingCount;
    product.ratingAvg = stats.ratingAvg;
    product.latestReview = stats.latestReview;

    const saved = await product.save();

    // Best-effort delete uploaded files.
    await Promise.all(
        photos.map(async (p) => {
            const filename = path.basename(String(p || ''));
            if (!filename) return;
            const fullPath = path.resolve(process.cwd(), 'uploads', filename);
            try {
                await fs.unlink(fullPath);
            } catch {
                // ignore
            }
        })
    );

    res.json({
        ratingAvg: saved.ratingAvg,
        ratingCount: saved.ratingCount,
        latestReview: saved.latestReview,
    });
});

export const getProductBySlug = asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const product = await Product.findOne({ slug });
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    res.json({ product });
});

export const createProduct = asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const slug = slugify(data.title);

    const exists = await Product.findOne({ slug });
    if (exists) {
        res.status(409);
        throw new Error('Product slug already exists');
    }

    const colors = (data.colors || []).map((c) => ({
        name: c.name,
        hex: c.hex,
        qty: typeof c.qty === 'number' && Number.isFinite(c.qty) ? Math.max(0, Math.floor(c.qty)) : 0,
        media: Array.isArray(c.media) ? c.media : [],
    }));
    const computedInStock = colors.length ? colors.some((c) => Number(c.qty || 0) > 0) : undefined;

    const created = await Product.create({
        title: data.title,
        slug,
        description: data.description || '',
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        currency: data.currency || 'USD',
        images: data.images || [],
        colors,
        category: data.category || DEFAULT_CATEGORY,
        tags: data.tags || [],
        inStock: computedInStock ?? (data.inStock ?? true),
    });

    res.status(201).json({ product: created });
});

export const getProductById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    res.json({ product });
});

export const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const patch = updateSchema.parse(req.body);

    const product = await Product.findById(id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }

    if (patch.title && patch.title !== product.title) {
        const nextSlug = slugify(patch.title);
        if (nextSlug !== product.slug) {
            const exists = await Product.findOne({ slug: nextSlug, _id: { $ne: product._id } });
            if (exists) {
                res.status(409);
                throw new Error('Product slug already exists');
            }
            product.slug = nextSlug;
        }
        product.title = patch.title;
    }

    if (patch.description !== undefined) product.description = patch.description || '';
    if (patch.price !== undefined) product.price = patch.price;
    if (patch.compareAtPrice !== undefined) product.compareAtPrice = patch.compareAtPrice;
    if (patch.currency !== undefined) product.currency = patch.currency || 'USD';
    if (patch.images !== undefined) product.images = patch.images || [];
    if (patch.colors !== undefined) {
        const colors = (patch.colors || []).map((c) => ({
            name: c.name,
            hex: c.hex,
            qty: typeof c.qty === 'number' && Number.isFinite(c.qty) ? Math.max(0, Math.floor(c.qty)) : 0,
            media: Array.isArray(c.media) ? c.media : [],
        }));
        product.colors = colors;
        product.inStock = colors.length ? colors.some((c) => Number(c.qty || 0) > 0) : true;
    }
    if (patch.category !== undefined) product.category = patch.category || DEFAULT_CATEGORY;
    if (patch.tags !== undefined) product.tags = patch.tags || [];
    if (patch.inStock !== undefined && patch.colors === undefined) product.inStock = patch.inStock;

    const saved = await product.save();
    res.json({ product: saved });
});

export const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
        res.status(404);
        throw new Error('Product not found');
    }
    await product.deleteOne();
    res.status(204).send();
});

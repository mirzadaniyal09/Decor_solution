import asyncHandler from 'express-async-handler';
import { z } from 'zod';

import { Order } from '../models/Order.js';
import { verifyToken } from '../utils/auth.js';
import { User } from '../models/User.js';

const itemSchema = z.object({
    key: z.string().min(1),
    productId: z.string().optional(),
    slug: z.string().optional(),
    title: z.string().min(1),
    image: z.string().optional(),
    price: z.number().nonnegative(),
    currency: z.string().optional(),
    qty: z.number().int().min(1).max(99),
    colorName: z.string().optional(),
    colorHex: z.string().optional(),
});

const shippingAddressSchema = z.object({
    country: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    postalCode: z.string().optional(),
    phone: z.string().min(1),
});

const billingAddressSchema = z.object({
    country: z.string().min(1),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    address1: z.string().min(1),
    address2: z.string().optional(),
    city: z.string().min(1),
    postalCode: z.string().optional(),
    phone: z.string().min(1).optional(),
});

const createOrderSchema = z.object({
    contact: z.object({
        emailOrPhone: z.string().min(3),
        email: z.string().email().optional(),
    }),
    shippingAddress: shippingAddressSchema,
    billingAddress: billingAddressSchema,
    paymentMethod: z.enum(['cod', 'bank']).default('cod'),
    items: z.array(itemSchema).min(1),
    currency: z.string().optional(),
});

const updateOrderStatusSchema = z.object({
    status: z.enum(['pending', 'shipped', 'delivered', 'cancelled', 'paid']).transform((v) => v.toLowerCase()),
});

function computeTotals(items) {
    const subtotal = items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0);
    return { subtotal };
}

async function getOptionalUser(req) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) return null;

    const token = header.slice('Bearer '.length);
    try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.sub).select('-passwordHash');
        return user || null;
    } catch {
        return null;
    }
}

export const createOrder = asyncHandler(async (req, res) => {
    const data = createOrderSchema.parse(req.body);

    const { subtotal } = computeTotals(data.items);

    // For now keep shipping/discount simple and deterministic.
    // If you want Shopify-like rates later, this is where we'd calculate it.
    const shipping = 0;
    const discount = 0;
    const total = Math.max(0, subtotal + shipping - discount);

    const user = await getOptionalUser(req);

    const created = await Order.create({
        user: user?._id,
        contact: {
            emailOrPhone: data.contact.emailOrPhone,
            email: data.contact.email,
        },
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        paymentMethod: data.paymentMethod,
        items: data.items,
        subtotal,
        shipping,
        discount,
        total,
        currency: data.currency || data.items[0]?.currency || 'USD',
        status: 'pending',
    });

    res.status(201).json({
        order: {
            id: created._id,
            status: created.status,
            total: created.total,
            currency: created.currency,
            createdAt: created.createdAt,
        },
    });
});

export const listAllOrders = asyncHandler(async (req, res) => {
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 200;

    const statusRaw = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : '';

    const query = {};
    if (statusRaw && statusRaw !== 'all') {
        // Map UI categories to stored values.
        if (statusRaw === 'cancel') {
            query.status = 'cancelled';
        } else if (statusRaw === 'delivered') {
            // Backward compatibility: some flows may have used 'paid' instead of 'delivered'.
            query.status = { $in: ['delivered', 'paid'] };
        } else if (['pending', 'shipped', 'cancelled', 'paid'].includes(statusRaw)) {
            query.status = statusRaw;
        }
    }

    const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('user', 'name email role createdAt')
        .lean();

    res.json({ orders });
});

export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!id) {
        res.status(400);
        throw new Error('Missing order id');
    }

    const parsed = updateOrderStatusSchema.parse(req.body || {});
    let nextStatus = parsed.status;

    // Backward-compatible alias support.
    if (nextStatus === 'paid') nextStatus = 'delivered';

    const order = await Order.findById(id);
    if (!order) {
        res.status(404);
        throw new Error('Order not found');
    }

    order.status = nextStatus;
    await order.save();

    res.json({
        order: {
            id: order._id,
            status: order.status,
            updatedAt: order.updatedAt,
        },
    });
});

import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';

import { User } from '../models/User.js';
import { signToken } from '../utils/auth.js';

const registerSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    token: z.string().min(10),
    password: z.string().min(8),
});

export const register = asyncHandler(async (req, res) => {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) {
        res.status(409);
        throw new Error('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: 'customer' });

    const token = signToken({ sub: user._id.toString(), role: user.role });
    res.status(201).json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
});

export const login = asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) {
        res.status(401);
        throw new Error('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
        res.status(401);
        throw new Error('Invalid credentials');
    }

    const token = signToken({ sub: user._id.toString(), role: user.role });
    res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
});

export const me = asyncHandler(async (req, res) => {
    res.json({ user: req.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordTokenHash = tokenHash;
        user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await user.save();

        // In production you'd email the token. For dev, return it.
        if (process.env.NODE_ENV !== 'production') {
            return res.json({ ok: true, resetToken });
        }
    }

    // Always return ok to avoid account enumeration.
    res.json({ ok: true });
});

export const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
        res.status(400);
        throw new Error('Invalid or expired reset token');
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    await user.save();

    const jwtToken = signToken({ sub: user._id.toString(), role: user.role });
    res.json({
        token: jwtToken,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
});

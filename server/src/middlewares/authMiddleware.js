import asyncHandler from 'express-async-handler';
import { verifyToken } from '../utils/auth.js';
import { User } from '../models/User.js';

export const requireAuth = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        res.status(401);
        throw new Error('Missing Authorization header');
    }

    const token = header.slice('Bearer '.length);
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.sub).select('-passwordHash');
    if (!user) {
        res.status(401);
        throw new Error('Invalid token');
    }

    req.user = user;
    next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header) {
        return next();
    }
    if (!header.startsWith('Bearer ')) {
        res.status(401);
        throw new Error('Invalid Authorization header');
    }

    const token = header.slice('Bearer '.length);
    const decoded = verifyToken(token);

    const user = await User.findById(decoded.sub).select('-passwordHash');
    if (!user) {
        res.status(401);
        throw new Error('Invalid token');
    }

    req.user = user;
    next();
});

export function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401);
            throw new Error('Not authenticated');
        }
        if (req.user.role !== role) {
            res.status(403);
            throw new Error('Forbidden');
        }
        next();
    };
}

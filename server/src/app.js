import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import siteSettingsRoutes from './routes/siteSettingsRoutes.js';

dotenv.config();

const app = express();

const bodyLimit = process.env.BODY_LIMIT_MB ? `${process.env.BODY_LIMIT_MB}mb` : '200mb';

app.use(helmet());

const defaultOrigins = [
    'http://localhost:5073',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:5176',
];

const envOrigins = (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

app.use(
    cors({
        origin(origin, cb) {
            // Allow non-browser requests (no Origin header)
            if (!origin) return cb(null, true);
            if (allowedOrigins.includes(origin)) return cb(null, true);

            // In development, Vite may pick a different port if the default is busy.
            // Allow localhost loopback origins to avoid dev-time CORS friction.
            if (process.env.NODE_ENV === 'development') {
                const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/.test(origin);
                if (isLocalhost) return cb(null, true);
            }
            return cb(new Error(`CORS blocked for origin: ${origin}`));
        },
        credentials: true,
    })
);
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));
app.use(morgan('dev'));

// Serve uploaded review photos.
app.use('/api/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => res.json({ ok: true, name: 'decor-solution-api' }));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/site-settings', siteSettingsRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

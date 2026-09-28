import app from '../server/src/app.js';
import { connectDb } from '../server/src/config/db.js';

export default async function handler(req, res) {
    try {
        await connectDb();
        return app(req, res);
    } catch (error) {
        console.error('API Error:', error);

        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
            error: process.env.NODE_ENV === 'production'
                ? undefined
                : error.message,
        });
    }
}
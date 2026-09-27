import app from '../server/src/app.js';
import { connectDb } from '../server/src/config/db.js';

export default async function handler(req, res) {
  try {
    await connectDb();
    return app(req, res);
  } catch (error) {
    console.error('API initialization failed:', error);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
}
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

import { connectDb } from '../config/db.js';
import { seedDatabase } from './seedData.js';

async function run() {
    await connectDb();

    const result = await seedDatabase({ force: true });
    // eslint-disable-next-line no-console
    console.log('Seed complete', result);
    await mongoose.disconnect();
}

run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

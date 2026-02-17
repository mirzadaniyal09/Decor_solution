import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

import { connectDb } from '../config/db.js';
import { Product } from '../models/Product.js';

const ALLOWED = ['New Arrivals', 'Offers', 'Top Sellers', 'Limited Edition'];

function toCategoryFromTags(tags) {
    const list = Array.isArray(tags) ? tags.map((t) => String(t || '').trim().toLowerCase()).filter(Boolean) : [];

    const hasOffer = list.includes('offer');
    const hasTopSeller = list.includes('top-seller');
    const hasLimited = list.includes('limited-edition');

    // Prefer keeping Offers/Top Sellers buckets populated, but still surface Limited Edition.
    // If something is both Top Seller and Limited (but not an Offer), treat it as Limited Edition.
    if (hasLimited && hasTopSeller && !hasOffer) return 'Limited Edition';
    if (hasOffer) return 'Offers';
    if (hasTopSeller) return 'Top Sellers';
    if (hasLimited) return 'Limited Edition';

    return 'New Arrivals';
}

async function run() {
    await connectDb();

    const force = process.argv.includes('--force');

    const products = await Product.find({}).select('category tags');

    let changed = 0;
    const counts = { 'New Arrivals': 0, Offers: 0, 'Top Sellers': 0, 'Limited Edition': 0 };

    for (const p of products) {
        const current = String(p.category || '').trim();
        const next = force ? toCategoryFromTags(p.tags) : (ALLOWED.includes(current) ? current : toCategoryFromTags(p.tags));

        counts[next] += 1;

        if (next !== current) {
            p.category = next;
            await p.save();
            changed += 1;
        }
    }

    // eslint-disable-next-line no-console
    console.log('Category migration complete', { total: products.length, changed, counts });

    await mongoose.disconnect();
}

run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { slugify } from './slugify.js';

const sampleProducts = [
    {
        title: 'Handmade Ceramic Vase',
        description: 'Minimal ceramic vase for modern spaces.',
        price: 34.0,
        compareAtPrice: 45.0,
        currency: 'USD',
        category: 'Offers',
        tags: ['ceramic', 'minimal', 'offer', 'limited-edition'],
        images: [
            'https://picsum.photos/seed/product-vase-1/1400/1750',
            'https://picsum.photos/seed/product-vase-1b/1400/1750',
            'https://picsum.photos/seed/product-vase-1c/1400/1750',
        ],
        colors: [
            { name: 'Cream', hex: '#F2E9DA' },
            { name: 'Charcoal', hex: '#2E2E2E' },
        ],
    },
    {
        title: 'Woven Throw Pillow',
        description: 'Soft woven pillow cover with texture.',
        price: 22.0,
        currency: 'USD',
        category: 'Limited Edition',
        tags: ['woven', 'textile', 'top-seller', 'limited-edition'],
        images: [
            'https://picsum.photos/seed/product-pillow-1/1400/1750',
            'https://picsum.photos/seed/product-pillow-1b/1400/1750',
        ],
        colors: [
            { name: 'Sand', hex: '#D9C6A5' },
            { name: 'Terracotta', hex: '#C65A3A' },
            { name: 'Olive', hex: '#556B2F' },
        ],
    },
    {
        title: 'Scented Candle - Cedar',
        description: 'Warm cedar notes with a clean burn.',
        price: 18.0,
        currency: 'USD',
        category: 'Top Sellers',
        tags: ['candle', 'scented', 'top-seller'],
        images: [
            'https://picsum.photos/seed/product-candle-1/1400/1750',
            'https://picsum.photos/seed/product-candle-1b/1400/1750',
        ],
        colors: [
            { name: 'Cedar', hex: '#8B5A2B' },
            { name: 'Smoke', hex: '#4B4B4B' },
        ],
    },

    // Hotpots / Cookware
    {
        title: 'Cast Iron Dutch Oven - Matte Black',
        description: 'Heavy-duty cast iron pot for slow cooking and stews.',
        price: 89.0,
        compareAtPrice: 119.0,
        currency: 'USD',
        category: 'Offers',
        tags: ['cookware', 'cast-iron', 'dutch-oven', 'top-seller', 'offer', 'limited-edition'],
        images: [
            'https://picsum.photos/seed/product-hotpot-1/1400/1750',
            'https://picsum.photos/seed/product-hotpot-1b/1400/1750',
        ],
        colors: [
            { name: 'Matte Black', hex: '#1A1A1A' },
            { name: 'Burgundy', hex: '#6D1F2B' },
        ],
    },
    {
        title: 'Stainless Steel Stock Pot - 8Qt',
        description: 'Tall stock pot for soups, pasta, and batch cooking.',
        price: 54.0,
        currency: 'USD',
        category: 'Top Sellers',
        tags: ['cookware', 'stainless-steel', 'stock-pot', 'top-seller'],
        images: [
            'https://picsum.photos/seed/product-hotpot-2/1400/1750',
            'https://picsum.photos/seed/product-hotpot-2b/1400/1750',
        ],
        colors: [
            { name: 'Steel', hex: '#C9CDD3' },
            { name: 'Graphite', hex: '#3E434A' },
        ],
    },
    {
        title: 'Enamel Hotpot - Forest Green',
        description: 'Easy-clean enamel pot with a cozy, modern look.',
        price: 62.0,
        currency: 'USD',
        category: 'New Arrivals',
        tags: ['cookware', 'enamel', 'hotpot'],
        images: [
            'https://picsum.photos/seed/product-hotpot-3/1400/1750',
            'https://picsum.photos/seed/product-hotpot-3b/1400/1750',
        ],
        colors: [
            { name: 'Forest', hex: '#1F5B3A' },
            { name: 'Cream', hex: '#F2E9DA' },
        ],
    },
    {
        title: 'Copper Sauce Pot - Hammered Finish',
        description: 'Statement copper pot for style-forward kitchens.',
        price: 78.0,
        currency: 'USD',
        category: 'New Arrivals',
        tags: ['cookware', 'copper', 'sauce-pot'],
        images: [
            'https://picsum.photos/seed/product-hotpot-4/1400/1750',
            'https://picsum.photos/seed/product-hotpot-4b/1400/1750',
        ],
        colors: [
            { name: 'Copper', hex: '#B87333' },
            { name: 'Black', hex: '#111111' },
        ],
    },
    {
        title: 'Minimal Clay Hotpot - Natural',
        description: 'A rustic clay pot that looks great on open shelves.',
        price: 46.0,
        currency: 'USD',
        category: 'New Arrivals',
        tags: ['cookware', 'clay', 'handmade'],
        images: [
            'https://picsum.photos/seed/product-hotpot-5/1400/1750',
            'https://picsum.photos/seed/product-hotpot-5b/1400/1750',
        ],
        colors: [
            { name: 'Natural', hex: '#D1B48C' },
            { name: 'Charcoal', hex: '#2E2E2E' },
        ],
    },
    {
        title: 'Nonstick Soup Pot - 5Qt',
        description: 'Lightweight pot for quick weekday meals.',
        price: 39.0,
        currency: 'USD',
        category: 'New Arrivals',
        tags: ['cookware', 'nonstick', 'soup-pot'],
        images: [
            'https://picsum.photos/seed/product-hotpot-6/1400/1750',
            'https://picsum.photos/seed/product-hotpot-6b/1400/1750',
        ],
        colors: [
            { name: 'Onyx', hex: '#202020' },
            { name: 'Stone', hex: '#A7A7A7' },
        ],
    },
];

export async function seedDatabase({ force = false } = {}) {
    const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin12345!';

    if (!force) {
        const existing = await Product.countDocuments();
        if (existing > 0) return { seeded: false };
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await User.updateOne(
        { email: adminEmail },
        {
            $set: { name: 'Admin', passwordHash, role: 'admin' },
            $setOnInsert: { email: adminEmail },
        },
        { upsert: true }
    );

    const productsWithSlugs = sampleProducts.map((p) => ({ ...p, slug: slugify(p.title) }));
    if (force) {
        await Product.deleteMany({});
        await Product.insertMany(productsWithSlugs);
    } else {
        for (const product of productsWithSlugs) {
            await Product.updateOne({ slug: product.slug }, { $setOnInsert: product }, { upsert: true });
        }
    }

    return { seeded: true, products: productsWithSlugs.length };
}

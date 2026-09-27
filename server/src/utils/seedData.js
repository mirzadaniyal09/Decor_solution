import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Product } from '../models/Product.js';
import { slugify } from './slugify.js';

const sampleProducts = [
    {
        title: 'Textured Ceramic Vase',
        description: 'A clean-lined vase for shelves, consoles, and side tables.',
        price: 34.0,
        compareAtPrice: 45.0,
        currency: 'USD',
        category: 'New Arrivals',
        tags: ['ceramic', 'minimal', 'handmade'],
        images: [
            'https://picsum.photos/seed/product-new-1/1400/1750',
            'https://picsum.photos/seed/product-new-1b/1400/1750',
        ],
        colors: [
            { name: 'Cream', hex: '#F2E9DA' },
            { name: 'Charcoal', hex: '#2E2E2E' },
        ],
    },
    {
        title: 'Woven Throw Pillow',
        description: 'Soft woven pillow cover with a warm, tactile finish.',
        price: 22.0,
        currency: 'USD',
        category: 'New Arrivals',
        tags: ['woven', 'textile', 'new-arrival'],
        images: [
            'https://picsum.photos/seed/product-new-2/1400/1750',
            'https://picsum.photos/seed/product-new-2b/1400/1750',
        ],
        colors: [
            { name: 'Sand', hex: '#D9C6A5' },
            { name: 'Terracotta', hex: '#C65A3A' },
        ],
    },
    {
        title: 'Scented Candle - Cedar',
        description: 'Warm cedar notes with a clean, even burn.',
        price: 18.0,
        currency: 'USD',
        category: 'Top Sellers',
        tags: ['candle', 'scented', 'top-seller'],
        images: [
            'https://picsum.photos/seed/product-top-1/1400/1750',
            'https://picsum.photos/seed/product-top-1b/1400/1750',
        ],
        colors: [
            { name: 'Cedar', hex: '#8B5A2B' },
            { name: 'Smoke', hex: '#4B4B4B' },
        ],
    },
    {
        title: 'Stainless Steel Stock Pot - 8Qt',
        description: 'Tall stock pot for soups, pasta, and batch cooking.',
        price: 54.0,
        currency: 'USD',
        category: 'Top Sellers',
        tags: ['cookware', 'stainless-steel', 'top-seller'],
        images: [
            'https://picsum.photos/seed/product-top-2/1400/1750',
            'https://picsum.photos/seed/product-top-2b/1400/1750',
        ],
        colors: [
            { name: 'Steel', hex: '#C9CDD3' },
            { name: 'Graphite', hex: '#3E434A' },
        ],
    },
    {
        title: 'Cast Iron Dutch Oven - Matte Black',
        description: 'Heavy-duty cast iron pot for slow cooking and stews.',
        price: 89.0,
        compareAtPrice: 119.0,
        currency: 'USD',
        category: 'Offers',
        tags: ['cookware', 'cast-iron', 'dutch-oven', 'offer'],
        images: [
            'https://picsum.photos/seed/product-offer-1/1400/1750',
            'https://picsum.photos/seed/product-offer-1b/1400/1750',
        ],
        colors: [
            { name: 'Matte Black', hex: '#1A1A1A' },
            { name: 'Burgundy', hex: '#6D1F2B' },
        ],
    },
    {
        title: 'Handmade Ceramic Vase - Set',
        description: 'A styled pair of vases with a discounted bundle price.',
        price: 49.0,
        compareAtPrice: 68.0,
        currency: 'USD',
        category: 'Offers',
        tags: ['ceramic', 'decor', 'offer'],
        images: [
            'https://picsum.photos/seed/product-offer-2/1400/1750',
            'https://picsum.photos/seed/product-offer-2b/1400/1750',
        ],
        colors: [
            { name: 'Stone', hex: '#D7D2C8' },
            { name: 'Black', hex: '#111111' },
        ],
    },
    {
        title: 'Limited Edition Clay Hotpot',
        description: 'A rustic clay pot with a small-batch finish.',
        price: 46.0,
        currency: 'USD',
        category: 'Limited Edition',
        tags: ['cookware', 'clay', 'limited-edition'],
        images: [
            'https://picsum.photos/seed/product-limited-1/1400/1750',
            'https://picsum.photos/seed/product-limited-1b/1400/1750',
        ],
        colors: [
            { name: 'Natural', hex: '#D1B48C' },
            { name: 'Charcoal', hex: '#2E2E2E' },
        ],
    },
    {
        title: 'Linen Accent Cushion - Limited Run',
        description: 'A softly structured cushion with a seasonal colorway.',
        price: 28.0,
        currency: 'USD',
        category: 'Limited Edition',
        tags: ['linen', 'textile', 'limited-edition'],
        images: [
            'https://picsum.photos/seed/product-limited-2/1400/1750',
            'https://picsum.photos/seed/product-limited-2b/1400/1750',
        ],
        colors: [
            { name: 'Olive', hex: '#556B2F' },
            { name: 'Sand', hex: '#D9C6A5' },
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

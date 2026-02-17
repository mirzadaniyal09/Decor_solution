import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        title: { type: String, trim: true, required: true },
        slug: { type: String, trim: true, lowercase: true, unique: true, required: true },
        description: { type: String, default: '' },
        price: { type: Number, required: true, min: 0 },
        compareAtPrice: { type: Number, min: 0 },
        currency: { type: String, default: 'USD' },
        images: [{ type: String }],
        ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
        ratingCount: { type: Number, default: 0, min: 0 },
        latestReview: {
            name: { type: String, trim: true },
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String, trim: true },
            createdAt: { type: Date },
        },
        reviews: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
                name: { type: String, trim: true, default: 'Anonymous' },
                rating: { type: Number, required: true, min: 1, max: 5 },
                comment: { type: String, trim: true, default: '' },
                photos: [{ type: String }],
                createdAt: { type: Date, default: Date.now },
            },
        ],
        colors: [
            {
                name: { type: String, trim: true },
                hex: { type: String, trim: true },
                qty: { type: Number, min: 0, default: 0 },
                media: [
                    {
                        type: { type: String, enum: ['image', 'video'], default: 'image' },
                        src: { type: String },
                    },
                ],
            },
        ],
        category: { type: String, default: 'New Arrivals' },
        tags: [{ type: String }],
        inStock: { type: Boolean, default: true },
    },
    { timestamps: true }
);

productSchema.index({ title: 'text', description: 'text', category: 'text', tags: 'text' });

export const Product = mongoose.model('Product', productSchema);

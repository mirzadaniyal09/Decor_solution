import mongoose from 'mongoose';

const heroSlideSchema = new mongoose.Schema(
    {
        id: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
        eyebrow: { type: String, default: '' },
        title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        ctaLabel: { type: String, default: '' },
        ctaTo: { type: String, default: '' },
    },
    { _id: false }
);

const collectionImageSchema = new mongoose.Schema(
    {
        id: { type: String, default: '' },
        imageUrl: { type: String, default: '' },
    },
    { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
    {
        heroBannerUrl: { type: String, default: '' },
        heroSlides: { type: [heroSlideSchema], default: [] },
        collectionImages: { type: [collectionImageSchema], default: [] },
    },
    { timestamps: true }
);

export const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

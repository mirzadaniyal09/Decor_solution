import dotenv from 'dotenv';
dotenv.config();

import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { put } from '@vercel/blob';

import { connectDb } from '../config/db.js';
import { Product } from '../models/Product.js';
import { SiteSettings } from '../models/SiteSettings.js';

const localUploadRoots = [
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), 'server/uploads'),
];
const migratedUrls = new Map();

function localUploadName(value) {
    const input = String(value || '').trim();
    const match = input.match(/(?:^|\/)api\/uploads\/([^/?#]+)|(?:^|\/)uploads\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1] || match[2]) : '';
}

async function migrateMediaUrl(value) {
    const filename = localUploadName(value);
    if (!filename) return value;
    if (migratedUrls.has(filename)) return migratedUrls.get(filename);

    let buffer;
    for (const root of localUploadRoots) {
        try {
            buffer = await fs.readFile(path.join(root, path.basename(filename)));
            break;
        } catch {
            // Try the other known local uploads directory.
        }
    }
    if (!buffer) {
        throw new Error(`Local upload not found: ${filename}`);
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = ({
        '.gif': 'image/gif',
        '.jpeg': 'image/jpeg',
        '.jpg': 'image/jpeg',
        '.m4v': 'video/x-m4v',
        '.mov': 'video/quicktime',
        '.mp4': 'video/mp4',
        '.png': 'image/png',
        '.webm': 'video/webm',
        '.webp': 'image/webp',
    })[ext] || 'application/octet-stream';
    const blob = await put(`legacy-uploads/${filename}`, buffer, {
        access: 'public',
        addRandomSuffix: true,
        contentType,
    });
    migratedUrls.set(filename, blob.url);
    return blob.url;
}

async function run() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        throw new Error('BLOB_READ_WRITE_TOKEN is required');
    }
    await connectDb();

    const products = await Product.find();
    for (const product of products) {
        product.images = await Promise.all((product.images || []).map(migrateMediaUrl));
        for (const color of product.colors || []) {
            for (const media of color.media || []) {
                media.src = await migrateMediaUrl(media.src);
            }
        }
        for (const review of product.reviews || []) {
            review.photos = await Promise.all((review.photos || []).map(migrateMediaUrl));
        }
        await product.save();
    }

    const settings = await SiteSettings.findOne();
    if (settings) {
        settings.heroBannerUrl = await migrateMediaUrl(settings.heroBannerUrl);
        for (const slide of settings.heroSlides || []) {
            slide.imageUrl = await migrateMediaUrl(slide.imageUrl);
        }
        for (const image of settings.collectionImages || []) {
            image.imageUrl = await migrateMediaUrl(image.imageUrl);
        }
        await settings.save();
    }

    console.log(`Migrated ${migratedUrls.size} unique uploads across ${products.length} products.`);
}

run()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
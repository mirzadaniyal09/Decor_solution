import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';

import { connectDb } from '../config/db.js';
import { Product } from '../models/Product.js';

const uploadsDir = path.resolve(process.cwd(), 'uploads');

function extFromMime(mime) {
    const m = String(mime || '').toLowerCase();
    if (m === 'image/jpeg') return '.jpg';
    if (m === 'image/jpg') return '.jpg';
    if (m === 'image/png') return '.png';
    if (m === 'image/webp') return '.webp';
    if (m === 'image/gif') return '.gif';

    if (m === 'video/mp4') return '.mp4';
    if (m === 'video/webm') return '.webm';
    if (m === 'video/quicktime') return '.mov';
    if (m === 'video/x-m4v') return '.m4v';

    return '';
}

function parseDataUri(dataUri) {
    const s = String(dataUri || '');
    const match = s.match(/^data:([^;]+);base64,(.*)$/i);
    if (!match) return null;
    const mime = match[1];
    const base64 = match[2];
    if (!mime || !base64) return null;
    return { mime, base64 };
}

async function writeUpload({ mime, base64 }) {
    const ext = extFromMime(mime) || '';
    if (!ext) throw new Error(`Unsupported mime: ${mime}`);

    const buf = Buffer.from(base64, 'base64');
    const filename = `${Date.now()}-${crypto.randomBytes(10).toString('hex')}${ext}`;
    const fullPath = path.join(uploadsDir, filename);

    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(fullPath, buf);

    return `/api/uploads/${filename}`;
}

async function migrate() {
    await connectDb();

    const candidates = await Product.find({
        $or: [
            { images: { $elemMatch: { $regex: /^data:/ } } },
            { 'colors.media.src': { $regex: /^data:/ } },
        ],
    });

    // eslint-disable-next-line no-console
    console.log(`Found ${candidates.length} product(s) with data: media`);

    let changedProducts = 0;
    let changedItems = 0;

    for (const product of candidates) {
        let changed = false;

        // Top-level images
        if (Array.isArray(product.images)) {
            for (let i = 0; i < product.images.length; i++) {
                const src = product.images[i];
                if (typeof src !== 'string' || !src.startsWith('data:')) continue;
                const parsed = parseDataUri(src);
                if (!parsed) continue;
                try {
                    const url = await writeUpload(parsed);
                    product.images[i] = url;
                    changed = true;
                    changedItems++;
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn(`Skip image on ${product._id}:`, e.message || e);
                }
            }
        }

        // Color media
        if (Array.isArray(product.colors)) {
            for (const color of product.colors) {
                if (!Array.isArray(color?.media)) continue;
                for (let i = 0; i < color.media.length; i++) {
                    const item = color.media[i];
                    const src = item?.src;
                    if (typeof src !== 'string' || !src.startsWith('data:')) continue;
                    const parsed = parseDataUri(src);
                    if (!parsed) continue;
                    try {
                        const url = await writeUpload(parsed);
                        color.media[i] = { ...item, src: url };
                        changed = true;
                        changedItems++;
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.warn(`Skip color media on ${product._id}:`, e.message || e);
                    }
                }
            }
        }

        if (changed) {
            await product.save();
            changedProducts++;
            // eslint-disable-next-line no-console
            console.log(`Updated ${product._id} (${product.slug})`);
        }
    }

    // eslint-disable-next-line no-console
    console.log(`Done. Updated ${changedProducts} product(s), migrated ${changedItems} media item(s).`);

    await mongoose.disconnect();
}

migrate().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

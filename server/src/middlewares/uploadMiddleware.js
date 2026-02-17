import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const uploadsDir = path.resolve(process.cwd(), 'uploads');

try {
    fs.mkdirSync(uploadsDir, { recursive: true });
} catch {
    // ignore
}

const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function safeExt(originalName = '') {
    const ext = path.extname(originalName).toLowerCase();
    return ALLOWED_EXTS.has(ext) ? ext : '';
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = safeExt(file.originalname) || '.jpg';
        const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        cb(null, name);
    },
});

function fileFilter(req, file, cb) {
    if (!file?.mimetype?.startsWith('image/')) {
        return cb(new Error('Only image uploads are allowed'));
    }

    const ext = safeExt(file.originalname);
    if (!ext) {
        return cb(new Error('Unsupported image type. Use JPG, PNG, WEBP, or GIF.'));
    }

    cb(null, true);
}

export const reviewPhotoUpload = multer({
    storage,
    fileFilter,
    limits: {
        files: 5,
        fileSize: 5 * 1024 * 1024,
    },
});

// Product media (images + videos)
const ALLOWED_MEDIA_EXTS = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.gif',
    '.mp4', '.webm', '.mov', '.m4v',
]);

function safeMediaExt(originalName = '') {
    const ext = path.extname(originalName).toLowerCase();
    return ALLOWED_MEDIA_EXTS.has(ext) ? ext : '';
}

const productMediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const ext = safeMediaExt(file.originalname);
        if (!ext) return cb(new Error('Unsupported media type. Use JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, or M4V.'));
        const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
        cb(null, name);
    },
});

function productMediaFilter(req, file, cb) {
    const mime = String(file?.mimetype || '');
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    if (!isImage && !isVideo) {
        return cb(new Error('Only image/video uploads are allowed'));
    }
    const ext = safeMediaExt(file.originalname);
    if (!ext) {
        return cb(new Error('Unsupported media type. Use JPG, PNG, WEBP, GIF, MP4, WEBM, MOV, or M4V.'));
    }
    cb(null, true);
}

export const productMediaUpload = multer({
    storage: productMediaStorage,
    fileFilter: productMediaFilter,
    limits: {
        files: 10,
        fileSize: 50 * 1024 * 1024,
    },
});

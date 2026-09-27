import { upload } from '@vercel/blob/client';
import { apiPost, getApiUrl } from './api.js';
import { getToken } from './auth.js';

export async function uploadMediaFiles(files, purpose = 'admin') {
    const fileList = Array.from(files || []).filter(Boolean);
    if (!fileList.length) return { files: [] };

    if (import.meta.env.VITE_UPLOAD_PROVIDER !== 'vercel-blob') {
        const formData = new FormData();
        fileList.forEach((file) => formData.append('files', file));
        return apiPost('/api/uploads/product-media', formData);
    }

    const token = getToken();
    const uploaded = await Promise.all(fileList.map((file) => upload(file.name, file, {
        access: 'public',
        handleUploadUrl: getApiUrl('/api/uploads/blob-token'),
        clientPayload: purpose,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        multipart: file.size > 5 * 1024 * 1024,
    })));

    return {
        files: uploaded.map((blob, index) => ({
            url: blob.url,
            type: fileList[index].type.startsWith('video/') ? 'video' : 'image',
            originalName: fileList[index].name,
            mime: fileList[index].type,
            size: fileList[index].size,
        })),
    };
}
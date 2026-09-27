import { getToken } from './auth.js';

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

export function getApiUrl(path) {
    if (!API_BASE_URL || !String(path).startsWith('/api/')) return path;
    return `${API_BASE_URL}${path}`;
}

export async function apiRequest(path, { method = 'GET', body, token } = {}) {
    const headers = {};
    const authToken = token ?? getToken();
    if (authToken) headers.Authorization = `Bearer ${authToken}`;

    // Avoid 304 (empty body) responses causing JSON parsing issues.
    headers['Cache-Control'] = 'no-cache';
    headers.Pragma = 'no-cache';

    let requestBody;
    if (body !== undefined) {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        if (isFormData) {
            requestBody = body;
        } else {
            headers['Content-Type'] = 'application/json';
            requestBody = JSON.stringify(body);
        }
    }

    let res;
    try {
        res = await fetch(getApiUrl(path), {
            method,
            headers,
            body: requestBody,
            cache: 'no-store',
        });
    } catch {
        throw new Error(`API not reachable${API_BASE_URL ? ` at ${API_BASE_URL}` : ''}`);
    }

    if (!res.ok) {
        let message = 'Request failed';
        try {
            const data = await res.json();
            const serverMessage = data?.message;
            const list = Array.isArray(data?.errors) ? data.errors : [];
            const listMessages = list
                .map((e) => (typeof e?.message === 'string' ? e.message.trim() : ''))
                .filter(Boolean);

            if (listMessages.length) {
                // multi-line friendly validation errors (deduped)
                const combined = [serverMessage, ...listMessages]
                    .map((m) => (typeof m === 'string' ? m.trim() : ''))
                    .filter(Boolean);
                message = Array.from(new Set(combined)).join('\n');
            } else {
                message = serverMessage || message;
            }
        } catch {
            try {
                const text = await res.text();
                if (text) message = text;
            } catch {
                // ignore
            }
        }
        throw new Error(message);
    }

    if (res.status === 204) return null;
    return res.json();
}

export function apiGet(path, opts) {
    return apiRequest(path, { ...opts, method: 'GET' });
}

export function apiPost(path, body, opts) {
    return apiRequest(path, { ...opts, method: 'POST', body });
}

export function apiPut(path, body, opts) {
    return apiRequest(path, { ...opts, method: 'PUT', body });
}

export function apiDelete(path, opts) {
    return apiRequest(path, { ...opts, method: 'DELETE' });
}

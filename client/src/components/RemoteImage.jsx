import { useEffect, useMemo, useRef, useState } from 'react';

import imageUnavailable from '../assets/image-unavailable.svg';
import { getApiUrl } from '../lib/api.js';

const DEFAULT_FALLBACK = imageUnavailable;

function normalizeSrc(input) {
    const raw = typeof input === 'string' ? input.trim() : '';
    if (!raw) return '';

    // Absolute / special URLs should remain untouched.
    if (/^(https?:)?\/\//i.test(raw)) return raw;
    if (/^(data:|blob:)/i.test(raw)) return raw;

    // Already API-prefixed.
    if (raw.startsWith('/api/')) return getApiUrl(raw);

    // Common stored variants for uploads.
    if (raw.startsWith('/uploads/')) return getApiUrl(`/api${raw}`);
    if (raw.startsWith('uploads/')) return getApiUrl(`/api/${raw}`);

    // If the DB stored just a filename, assume it lives under uploads.
    if (!raw.startsWith('/') && /\.(png|jpe?g|webp|gif|svg)$/i.test(raw)) {
        return getApiUrl(`/api/uploads/${raw}`);
    }

    return raw;
}

export default function RemoteImage({
    src,
    alt = '',
    className,
    loading = 'lazy',
    decoding = 'async',
    referrerPolicy,
    fallbackSrc = DEFAULT_FALLBACK,
    fade = true,
    fadeDurationMs = 450,
    style,
    onLoad: onLoadProp,
    onError: onErrorProp,
    ...rest
}) {
    const imgRef = useRef(null);
    const [currentSrc, setCurrentSrc] = useState(normalizeSrc(src) || normalizeSrc(fallbackSrc));
    const [loaded, setLoaded] = useState(false);

    const mergedStyle = useMemo(() => {
        const base = style || {};
        if (!fade) return base;
        return {
            ...base,
            opacity: loaded ? 1 : 0,
            transition: `opacity ${fadeDurationMs}ms ease`,
        };
    }, [style, fade, loaded, fadeDurationMs]);

    useEffect(() => {
        setLoaded(false);
        setCurrentSrc(normalizeSrc(src) || normalizeSrc(fallbackSrc));
    }, [src, fallbackSrc]);

    useEffect(() => {
        if (!fade) return;
        const img = imgRef.current;
        if (!img) return;

        // If the image is already cached, onLoad may not give us a paint with opacity 0.
        // Force a frame boundary so the transition reliably runs.
        if (img.complete) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setLoaded(true));
            });
        }
    }, [currentSrc, fade]);

    const handleError = (e) => {
        const normalizedFallback = normalizeSrc(fallbackSrc);
        if (normalizedFallback && currentSrc !== normalizedFallback) {
            setLoaded(false);
            setCurrentSrc(normalizedFallback);
        }

        if (typeof onErrorProp === 'function') {
            onErrorProp(e);
        }
    };

    return (
        <img
            ref={imgRef}
            src={currentSrc}
            alt={alt}
            className={className}
            loading={loading}
            decoding={decoding}
            referrerPolicy={referrerPolicy}
            onError={handleError}
            onLoad={(e) => {
                if (!fade) {
                    setLoaded(true);
                    if (typeof onLoadProp === 'function') onLoadProp(e);
                    return;
                }
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setLoaded(true);
                        if (typeof onLoadProp === 'function') onLoadProp(e);
                    });
                });
            }}
            style={mergedStyle}
            {...rest}
        />
    );
}

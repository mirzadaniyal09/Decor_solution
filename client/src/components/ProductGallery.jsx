import { useMemo, useState } from 'react';
import RemoteImage from './RemoteImage.jsx';

function normalizeMedia(media, imagesFallback) {
    const out = [];
    const seen = new Set();

    const mediaList = Array.isArray(media) ? media : [];
    for (const item of mediaList) {
        const type = item?.type === 'video' ? 'video' : 'image';
        const src = typeof item?.src === 'string' ? item.src.trim() : '';
        if (!src) continue;
        const key = `${type}|${src}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ type, src });
    }

    if (!out.length) {
        const imgs = Array.isArray(imagesFallback) ? imagesFallback : [];
        for (const img of imgs) {
            const src = typeof img === 'string' ? img.trim() : '';
            if (!src) continue;
            const key = `image|${src}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ type: 'image', src });
        }
    }

    return out;
}

export default function ProductGallery({ media, images, title }) {
    const gallery = useMemo(() => normalizeMedia(media, images), [media, images]);
    const [activeIndex, setActiveIndex] = useState(0);

    const safeIndex = Math.min(activeIndex, Math.max(0, gallery.length - 1));
    const activeItem = gallery[safeIndex];

    if (!gallery.length) {
        return (
            <div className="productGalleryMain">
                <RemoteImage src="" alt={title || ''} loading="eager" className="productGalleryMainImg" />
            </div>
        );
    }

    const showThumbs = gallery.length > 1;

    return (
        <div className={`productGallery ${showThumbs ? 'hasThumbs' : 'noThumbs'}`.trim()}>
            {gallery.length > 1 ? (
                <div className="productGalleryThumbs" aria-label="Product thumbnails">
                    {gallery.map((item, idx) => {
                        const isActive = idx === safeIndex;
                        return (
                            <button
                                key={`${item.type}|${item.src}`}
                                type="button"
                                className={`productGalleryThumb ${isActive ? 'active' : ''}`}
                                onClick={() => setActiveIndex(idx)}
                                aria-label={`Show media ${idx + 1}`}
                                aria-pressed={isActive}
                            >
                                {item.type === 'video' ? (
                                    <div className="productGalleryThumbImg" style={{ display: 'grid', placeItems: 'center' }}>
                                        <span className="muted" style={{ fontSize: '12px' }}>Video</span>
                                    </div>
                                ) : (
                                    <RemoteImage
                                        src={item.src}
                                        alt=""
                                        loading="lazy"
                                        className="productGalleryThumbImg"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : null}

            <div className="productGalleryMain">
                {activeItem?.type === 'video' ? (
                    <video
                        src={activeItem.src}
                        className="productGalleryMainImg"
                        controls
                        playsInline
                        preload="metadata"
                    />
                ) : (
                    <RemoteImage src={activeItem?.src} alt={title || ''} loading="eager" className="productGalleryMainImg" />
                )}
            </div>
        </div>
    );
}

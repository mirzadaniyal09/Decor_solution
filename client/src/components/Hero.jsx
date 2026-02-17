import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import RemoteImage from './RemoteImage.jsx';
import { IconPencil } from './Icons.jsx';
import { apiGet, apiPost, apiPut } from '../lib/api.js';
import { getStoredUser, isLoggedIn } from '../lib/auth.js';

const AUTOPLAY_MS = 4000;

const HERO_FALLBACK = 'https://picsum.photos/seed/decor-hero-fallback/2400/1200';

const defaultSlides = [
    {
        id: 'premium-collection',
        eyebrow: 'Where style meets comfort',
        title: 'Premium Everyday Collection',
        subtitle: 'Curated essentials with a modern look.',
        cta: { label: 'Shop Now', to: '/shop' },
        image:
            'https://picsum.photos/seed/decor-hero-1/2400/1200',
        tint: '#f3c6a2',
    },
    {
        id: 'cookware-hotpots',
        eyebrow: 'Cookware spotlight',
        title: 'Hotpots That Look Good',
        subtitle: 'Beautiful pieces for your kitchen shelf.',
        cta: { label: 'Browse Hotpots', to: '/shop?category=Hotpots' },
        image:
            'https://picsum.photos/seed/decor-hero-2/2400/1200',
        tint: '#f1b98f',
    },
    {
        id: 'new-arrivals',
        eyebrow: 'New in',
        title: 'Fresh Picks, Clean Aesthetic',
        subtitle: 'New arrivals that fit every space.',
        cta: { label: 'New Arrivals', to: '/shop?sort=new' },
        image:
            'https://picsum.photos/seed/decor-hero-3/2400/1200',
        tint: '#f6caa4',
    },
    {
        id: 'offers',
        eyebrow: 'Limited-time deals',
        title: 'Offers You’ll Love',
        subtitle: 'Best value picks for your home.',
        cta: { label: 'View Offers', to: '/shop?tag=offer' },
        image:
            'https://picsum.photos/seed/decor-hero-4/2400/1200',
        tint: '#f0be95',
    },
    {
        id: 'top-sellers',
        eyebrow: 'Customer favorites',
        title: 'Top Sellers',
        subtitle: 'Popular pieces, ready to ship.',
        cta: { label: 'Top Sellers', to: '/shop?tag=top-seller' },
        image:
            'https://picsum.photos/seed/decor-hero-5/2400/1200',
        tint: '#f2c29a',
    },
];

export default function Hero({ slides: slidesProp } = {}) {
    const [index, setIndex] = useState(0);
    const [siteSettings, setSiteSettings] = useState({ heroBannerUrl: '', heroSlides: [] });
    const [editOpen, setEditOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [adminError, setAdminError] = useState('');
    const [bannerSize, setBannerSize] = useState({ w: 0, h: 0 });
    const [adminSlideId, setAdminSlideId] = useState('');
    const [ctaLabelDraft, setCtaLabelDraft] = useState('');
    const [ctaToDraft, setCtaToDraft] = useState('');

    const heroRef = useRef(null);
    const fileRef = useRef(null);

    const isAdmin = Boolean(isLoggedIn() && getStoredUser()?.role === 'admin');

    const slides = useMemo(() => {
        const list = Array.isArray(slidesProp) ? slidesProp.filter(Boolean) : [];
        return list.length ? list : defaultSlides;
    }, [slidesProp]);

    const slide = useMemo(() => slides[index], [slides, index]);

    const siteHeroSlides = useMemo(() => {
        const raw = siteSettings?.heroSlides;
        const list = Array.isArray(raw) ? raw.filter(Boolean) : [];
        return list
            .map((s) => ({
                id: typeof s?.id === 'string' ? s.id.trim() : '',
                imageUrl: typeof s?.imageUrl === 'string' ? s.imageUrl.trim() : '',
                eyebrow: typeof s?.eyebrow === 'string' ? s.eyebrow.trim() : '',
                title: typeof s?.title === 'string' ? s.title.trim() : '',
                subtitle: typeof s?.subtitle === 'string' ? s.subtitle.trim() : '',
                ctaLabel: typeof s?.ctaLabel === 'string' ? s.ctaLabel.trim() : '',
                ctaTo: typeof s?.ctaTo === 'string' ? s.ctaTo.trim() : '',
            }))
            .filter((s) => s.id || s.imageUrl || s.eyebrow || s.title || s.subtitle || s.ctaLabel || s.ctaTo);
    }, [siteSettings]);

    const globalBannerUrl = useMemo(() => {
        const url = typeof siteSettings?.heroBannerUrl === 'string' ? siteSettings.heroBannerUrl.trim() : '';
        return url;
    }, [siteSettings]);

    const siteOverride = useMemo(() => {
        const id = typeof slide?.id === 'string' ? slide.id : '';
        if (id) {
            const byId = siteHeroSlides.find((s) => s.id === id);
            if (byId) return byId;
        }
        // Backward compatibility: if no ids were set, allow index-based overrides.
        if (!id && siteHeroSlides.length) {
            return siteHeroSlides[index] || null;
        }
        return null;
    }, [siteHeroSlides, slide, index]);

    const effectiveSlide = useMemo(() => {
        const o = siteOverride;
        const ctaLabel = (o?.ctaLabel || '').trim() || slide?.cta?.label;
        const ctaTo = (o?.ctaTo || '').trim() || slide?.cta?.to;

        return {
            ...slide,
            eyebrow: (o?.eyebrow || '').trim() || slide?.eyebrow,
            title: (o?.title || '').trim() || slide?.title,
            subtitle: (o?.subtitle || '').trim() || slide?.subtitle,
            cta: { label: ctaLabel, to: ctaTo },
        };
    }, [slide, siteOverride]);

    const heroImageSrc = useMemo(() => {
        // If per-slide settings exist, prefer them.
        const perSlide = (siteOverride?.imageUrl || '').trim();
        if (perSlide) return perSlide;

        // Backward compatibility: global override only applies if no per-slide settings exist.
        if (globalBannerUrl && siteHeroSlides.length === 0) return globalBannerUrl;

        return slide?.image || HERO_FALLBACK;
    }, [globalBannerUrl, siteHeroSlides.length, siteOverride, slide]);

    useEffect(() => {
        apiGet('/api/site-settings')
            .then((data) => {
                setSiteSettings({
                    heroBannerUrl: typeof data?.heroBannerUrl === 'string' ? data.heroBannerUrl.trim() : '',
                    heroSlides: Array.isArray(data?.heroSlides) ? data.heroSlides : [],
                });
            })
            .catch(() => {
                // Non-blocking: hero still works with slide images.
            });
    }, []);

    useEffect(() => {
        // Keep admin editor in sync with the currently visible slide.
        const currentId = typeof slide?.id === 'string' ? slide.id : '';
        setAdminSlideId((prev) => prev || currentId);
    }, [slide]);

    useEffect(() => {
        // Populate drafts whenever the selected admin slide changes.
        const selectedId = adminSlideId || (typeof slide?.id === 'string' ? slide.id : '');
        const base = slides.find((s) => (typeof s?.id === 'string' ? s.id : '') === selectedId) || slide;
        const override = siteHeroSlides.find((s) => s.id === selectedId) || null;

        setCtaLabelDraft((override?.ctaLabel || '').trim() || base?.cta?.label || '');
        setCtaToDraft((override?.ctaTo || '').trim() || base?.cta?.to || '');
    }, [adminSlideId, siteHeroSlides, slides, slide]);

    function upsertHeroSlideOverride(next) {
        const id = typeof next?.id === 'string' ? next.id.trim() : '';
        if (!id) return siteHeroSlides;
        const rest = siteHeroSlides.filter((s) => s.id !== id);
        return [...rest, next];
    }

    async function saveHeroSlides(nextSlides) {
        const saved = await apiPut('/api/site-settings', { heroSlides: nextSlides });
        setSiteSettings({
            heroBannerUrl: typeof saved?.heroBannerUrl === 'string' ? saved.heroBannerUrl.trim() : '',
            heroSlides: Array.isArray(saved?.heroSlides) ? saved.heroSlides : [],
        });
    }

    useEffect(() => {
        const el = heroRef.current;
        if (!el) return;

        const update = () => {
            const r = el.getBoundingClientRect();
            setBannerSize({ w: Math.round(r.width), h: Math.round(r.height) });
        };

        update();

        if (typeof ResizeObserver !== 'undefined') {
            const ro = new ResizeObserver(update);
            ro.observe(el);
            return () => ro.disconnect();
        }

        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);

    useEffect(() => {
        const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), AUTOPLAY_MS);
        return () => clearInterval(id);
    }, [slides.length]);

    useEffect(() => {
        setIndex((i) => Math.min(i, Math.max(0, slides.length - 1)));
    }, [slides.length]);

    return (
        <section className="heroWrap" aria-label="Hero">
            <div ref={heroRef} className="hero" style={{ ['--heroTint']: slide.tint }}>
                <RemoteImage
                    className="heroMedia"
                    src={heroImageSrc}
                    alt=""
                    loading="eager"
                    fade={false}
                    fallbackSrc={HERO_FALLBACK}
                    aria-hidden="true"
                />
                <div className="heroOverlay" aria-hidden="true" />

                {isAdmin ? (
                    <div className="heroAdmin" aria-label="Admin banner editor">
                        <button
                            type="button"
                            className="heroAdminEdit"
                            aria-label={editOpen ? 'Close banner editor' : 'Edit banner image'}
                            onClick={() => {
                                setAdminError('');
                                setEditOpen((v) => !v);
                            }}
                        >
                            <IconPencil />
                        </button>

                        {editOpen ? (
                            <div className="heroAdminPanel" role="dialog" aria-label="Edit banner image">
                                <div className="heroAdminTitle">Edit banner</div>
                                <div className="heroAdminMeta">
                                    <div>Current banner size: {bannerSize.w}×{bannerSize.h}px</div>
                                    <div>Recommended image: 2400×1200 (2:1)</div>
                                </div>

                                <label className="heroAdminField">
                                    <span className="heroAdminLabel">Slide</span>
                                    <select
                                        className="heroAdminSelect"
                                        value={adminSlideId || (typeof slide?.id === 'string' ? slide.id : '')}
                                        onChange={(e) => setAdminSlideId(e.target.value)}
                                    >
                                        {slides.map((s, i) => {
                                            const id = typeof s?.id === 'string' ? s.id : '';
                                            const label = s?.title ? String(s.title) : `Slide ${i + 1}`;
                                            return (
                                                <option key={id || i} value={id}>
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </label>

                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="heroAdminFile"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setAdminError('');
                                        setUploading(true);

                                        const selectedId = adminSlideId || (typeof slide?.id === 'string' ? slide.id : '');
                                        if (!selectedId) {
                                            setAdminError('This slide has no id; cannot save per-slide image');
                                            setUploading(false);
                                            if (fileRef.current) fileRef.current.value = '';
                                            return;
                                        }

                                        try {
                                            const form = new FormData();
                                            form.append('files', file);
                                            const uploaded = await apiPost('/api/uploads/product-media', form);
                                            const url = uploaded?.files?.[0]?.url ? String(uploaded.files[0].url) : '';
                                            if (!url) throw new Error('Upload failed');

                                            const currentOverride = siteHeroSlides.find((s) => s.id === selectedId) || { id: selectedId };
                                            const nextOverride = {
                                                ...currentOverride,
                                                id: selectedId,
                                                imageUrl: url,
                                            };

                                            const nextSlides = upsertHeroSlideOverride(nextOverride);
                                            await saveHeroSlides(nextSlides);
                                            setEditOpen(false);
                                        } catch (err) {
                                            setAdminError(err?.message || 'Failed to update banner');
                                        } finally {
                                            setUploading(false);
                                            if (fileRef.current) fileRef.current.value = '';
                                        }
                                    }}
                                />

                                <div className="heroAdminFields">
                                    <label className="heroAdminField">
                                        <span className="heroAdminLabel">Button label</span>
                                        <input
                                            className="heroAdminInput"
                                            type="text"
                                            value={ctaLabelDraft}
                                            onChange={(e) => setCtaLabelDraft(e.target.value)}
                                            placeholder="View Offers"
                                        />
                                    </label>

                                    <label className="heroAdminField">
                                        <span className="heroAdminLabel">Button link</span>
                                        <input
                                            className="heroAdminInput"
                                            type="text"
                                            value={ctaToDraft}
                                            onChange={(e) => setCtaToDraft(e.target.value)}
                                            placeholder="/shop?category=Offers"
                                        />
                                    </label>
                                </div>

                                <div className="heroAdminActions">
                                    <button
                                        type="button"
                                        className="heroAdminBtn"
                                        disabled={uploading}
                                        onClick={() => fileRef.current?.click()}
                                    >
                                        {uploading ? 'Uploading…' : 'Upload new image'}
                                    </button>

                                    <button
                                        type="button"
                                        className="heroAdminBtn secondary"
                                        disabled={uploading}
                                        onClick={async () => {
                                            setAdminError('');
                                            setUploading(true);
                                            try {
                                                const selectedId = adminSlideId || (typeof slide?.id === 'string' ? slide.id : '');
                                                if (!selectedId) throw new Error('This slide has no id; cannot reset');

                                                const rest = siteHeroSlides.filter((s) => s.id !== selectedId);
                                                await saveHeroSlides(rest);
                                                setEditOpen(false);
                                            } catch (err) {
                                                setAdminError(err?.message || 'Failed to reset slide');
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                    >
                                        Reset this slide
                                    </button>

                                    <button
                                        type="button"
                                        className="heroAdminBtn secondary"
                                        disabled={uploading}
                                        onClick={async () => {
                                            setAdminError('');
                                            setUploading(true);
                                            try {
                                                const selectedId = adminSlideId || (typeof slide?.id === 'string' ? slide.id : '');
                                                if (!selectedId) throw new Error('This slide has no id; cannot save');

                                                const currentOverride = siteHeroSlides.find((s) => s.id === selectedId) || { id: selectedId };
                                                const nextOverride = {
                                                    ...currentOverride,
                                                    id: selectedId,
                                                    ctaLabel: String(ctaLabelDraft || '').trim(),
                                                    ctaTo: String(ctaToDraft || '').trim(),
                                                };
                                                const nextSlides = upsertHeroSlideOverride(nextOverride);
                                                await saveHeroSlides(nextSlides);
                                                setEditOpen(false);
                                            } catch (err) {
                                                setAdminError(err?.message || 'Failed to save slide');
                                            } finally {
                                                setUploading(false);
                                            }
                                        }}
                                    >
                                        Save button
                                    </button>
                                </div>

                                {adminError ? <div className="heroAdminError">{adminError}</div> : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="heroLeft">
                    <div key={index} className="heroText">
                        <div className="heroEyebrow">{effectiveSlide.eyebrow}</div>
                        <h1 className="heroTitle">{effectiveSlide.title}</h1>
                        <p className="heroSubtitle">{effectiveSlide.subtitle}</p>
                        <div className="heroActions">
                            <Link className="cta" to={effectiveSlide.cta.to}>
                                {effectiveSlide.cta.label}
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="heroDots" role="tablist" aria-label="Slides">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            className={i === index ? 'dot active' : 'dot'}
                            aria-label={`Slide ${i + 1}`}
                            aria-pressed={i === index}
                            onClick={() => setIndex(i)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

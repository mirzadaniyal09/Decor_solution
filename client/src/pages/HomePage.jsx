import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Hero from '../components/Hero.jsx';
import RemoteImage from '../components/RemoteImage.jsx';
import { IconPencil } from '../components/Icons.jsx';
import { apiGet, apiPost, apiPut } from '../lib/api.js';
import { getStoredUser, isLoggedIn } from '../lib/auth.js';

async function fetchAllWatchBuyItems() {
    const first = await apiGet('/api/products/watch-buy?limit=48&page=1&sort=new');
    const items = Array.isArray(first?.items) ? first.items : [];
    const pages = Math.max(1, Number(first?.pages || 1));
    if (pages <= 1) return items;

    const restPages = Array.from({ length: pages - 1 }).map((_, i) => i + 2);
    const rest = await Promise.all(
        restPages.map((p) => apiGet(`/api/products/watch-buy?limit=48&page=${p}&sort=new`).catch(() => null))
    );

    for (const r of rest) {
        const list = Array.isArray(r?.items) ? r.items : [];
        items.push(...list);
    }

    return items;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function formatReviewCount(n) {
    const count = Number(n || 0);
    if (!Number.isFinite(count) || count <= 0) return 'No reviews';
    if (count === 1) return '1 review';
    return `${count} reviews`;
}

function Stars({ value }) {
    const rating = clamp(Number(value || 0), 0, 5);
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    const stars = [
        ...Array.from({ length: full }).map(() => '★'),
        ...(half ? ['⯪'] : []),
        ...Array.from({ length: empty }).map(() => '☆'),
    ].join('');
    return <span className="ratingStars" aria-label={`Rating ${rating} out of 5`}>{stars}</span>;
}

function formatMoney(amount, currency) {
    const v = Number(amount || 0);
    const c = String(currency || 'USD') || 'USD';
    if (!Number.isFinite(v)) return '0';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(v);
    } catch {
        return `$${v.toFixed(2)}`;
    }
}

function getFirstColorImageSrc(product) {
    const colors = Array.isArray(product?.colors) ? product.colors : [];
    for (const color of colors) {
        const media = Array.isArray(color?.media) ? color.media : [];
        for (const item of media) {
            if (item?.type === 'image' && typeof item?.src === 'string' && item.src.trim()) {
                return item.src.trim();
            }
        }
    }
    return '';
}

function getCardImages(product) {
    const images = Array.isArray(product?.images) ? product.images.filter(Boolean) : [];
    const primary = images[0] || getFirstColorImageSrc(product);
    const secondary = images[1] || '';
    return { primary, secondary };
}

export default function HomePage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newArrivals, setNewArrivals] = useState([]);
    const [topSellers, setTopSellers] = useState([]);
    const [offers, setOffers] = useState([]);
    const [limitedEdition, setLimitedEdition] = useState([]);

    const [watchBuyLoading, setWatchBuyLoading] = useState(true);
    const [watchBuyError, setWatchBuyError] = useState('');
    const [watchBuyProducts, setWatchBuyProducts] = useState([]);
    const [watchBuyPage, setWatchBuyPage] = useState(0);
    const [siteSettings, setSiteSettings] = useState({ collectionImages: [] });
    const [collectionUploadingId, setCollectionUploadingId] = useState('');
    const [collectionAdminError, setCollectionAdminError] = useState('');

    const collectionFileRefs = useRef({});

    const isAdmin = Boolean(isLoggedIn() && getStoredUser()?.role === 'admin');

    const heroSlides = useMemo(
        () => [
            {
                id: 'new-arrivals',
                eyebrow: 'New in',
                title: 'New Arrivals',
                subtitle: 'Fresh picks for your space.',
                cta: { label: 'Shop New Arrivals', to: '/shop?category=New%20Arrivals' },
                image: 'https://picsum.photos/seed/decor-collection-new/2400/1200',
                tint: '#f6caa4',
            },
            {
                id: 'top-sellers',
                eyebrow: 'Customer favorites',
                title: 'Top Sellers',
                subtitle: 'Bestsellers that ship fast.',
                cta: { label: 'Shop Top Sellers', to: '/shop?category=Top%20Sellers' },
                image: 'https://picsum.photos/seed/decor-collection-top/2400/1200',
                tint: '#f2c29a',
            },
            {
                id: 'offers',
                eyebrow: 'Limited-time deals',
                title: 'Offers',
                subtitle: 'Great value, while it lasts.',
                cta: { label: 'View Offers', to: '/shop?category=Offers' },
                image: 'https://picsum.photos/seed/decor-collection-offers/2400/1200',
                tint: '#f0be95',
            },
            {
                id: 'limited-edition',
                eyebrow: 'Collector picks',
                title: 'Limited Edition',
                subtitle: 'Small runs and special drops.',
                cta: { label: 'Shop Limited Edition', to: '/shop?category=Limited%20Edition' },
                image: 'https://picsum.photos/seed/decor-collection-limited/2400/1200',
                tint: '#f1b98f',
            },
        ],
        []
    );

    const collectionTiles = useMemo(
        () => [
            {
                id: 'new-arrivals',
                label: 'New Arrivals',
                to: '/shop?category=New%20Arrivals',
                image: 'https://picsum.photos/seed/decor-collection-new/500/500',
            },
            {
                id: 'top-sellers',
                label: 'Top Sellers',
                to: '/shop?category=Top%20Sellers',
                image: 'https://picsum.photos/seed/decor-collection-top/500/500',
            },
            {
                id: 'offers',
                label: 'Offers',
                to: '/shop?category=Offers',
                image: 'https://picsum.photos/seed/decor-collection-offers/500/500',
            },
            {
                id: 'limited-edition',
                label: 'Limited Edition',
                to: '/shop?category=Limited%20Edition',
                image: 'https://picsum.photos/seed/decor-collection-limited/500/500',
            },
        ],
        []
    );

    const siteCollectionImages = useMemo(() => {
        const raw = siteSettings?.collectionImages;
        const list = Array.isArray(raw) ? raw.filter(Boolean) : [];
        return list
            .map((c) => ({
                id: typeof c?.id === 'string' ? c.id.trim() : '',
                imageUrl: typeof c?.imageUrl === 'string' ? c.imageUrl.trim() : '',
            }))
            .filter((c) => c.id && c.imageUrl);
    }, [siteSettings]);

    function getCollectionImage(id, fallback) {
        const match = siteCollectionImages.find((c) => c.id === id);
        return match?.imageUrl || fallback;
    }

    function upsertCollectionImage(next) {
        const id = typeof next?.id === 'string' ? next.id.trim() : '';
        if (!id) return siteCollectionImages;
        const rest = siteCollectionImages.filter((c) => c.id !== id);
        return [...rest, next];
    }

    async function saveCollectionImages(nextImages) {
        const saved = await apiPut('/api/site-settings', { collectionImages: nextImages });
        setSiteSettings((prev) => ({
            ...prev,
            collectionImages: Array.isArray(saved?.collectionImages) ? saved.collectionImages : [],
        }));
    }

    async function handleCollectionUpload(id, file) {
        if (!id || !file) return;
        setCollectionAdminError('');
        setCollectionUploadingId(id);
        try {
            const form = new FormData();
            form.append('files', file);
            const uploaded = await apiPost('/api/uploads/product-media', form);
            const url = uploaded?.files?.[0]?.url ? String(uploaded.files[0].url) : '';
            if (!url) throw new Error('Upload failed');

            const next = upsertCollectionImage({ id, imageUrl: url });
            await saveCollectionImages(next);
        } catch (e) {
            const rawMessage = String(e?.message || '').toLowerCase();
            const message = rawMessage.includes('api not reachable')
                ? 'Upload unavailable. Please ensure the server is running.'
                : (e?.message || 'Failed to update collection image');
            setCollectionAdminError(message);
            window.setTimeout(() => setCollectionAdminError(''), 4000);
        } finally {
            setCollectionUploadingId('');
            if (collectionFileRefs.current?.[id]) {
                collectionFileRefs.current[id].value = '';
            }
        }
    }

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');

        Promise.all([
            apiGet('/api/products?limit=8&category=New%20Arrivals'),
            apiGet('/api/products?limit=8&category=Top%20Sellers'),
            apiGet('/api/products?limit=8&category=Offers'),
            apiGet('/api/products?limit=8&category=Limited%20Edition'),
        ])
            .then(([a, b, c, d]) => {
                if (cancelled) return;
                setNewArrivals(a?.items || []);
                setTopSellers(b?.items || []);
                setOffers(c?.items || []);
                setLimitedEdition(d?.items || []);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e.message || 'Failed to load');
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        apiGet('/api/site-settings')
            .then((data) => {
                setSiteSettings({
                    collectionImages: Array.isArray(data?.collectionImages) ? data.collectionImages : [],
                });
            })
            .catch(() => {
                // Non-blocking: collections can still render default images.
            });
    }, []);

    useEffect(() => {
        let cancelled = false;
        setWatchBuyLoading(true);
        setWatchBuyError('');

        fetchAllWatchBuyItems()
            .then((items) => {
                if (cancelled) return;
                setWatchBuyProducts(items || []);
            })
            .catch((e) => {
                if (cancelled) return;
                setWatchBuyError(e.message || 'Failed to load');
            })
            .finally(() => {
                if (cancelled) return;
                setWatchBuyLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const watchBuyVideos = useMemo(() => {
        const list = Array.isArray(watchBuyProducts) ? watchBuyProducts : [];
        const byId = new Map();
        for (const p of list) {
            const id = p?._id ? String(p._id) : '';
            if (!id || byId.has(id)) continue;
            byId.set(id, p);
        }

        const out = [];
        for (const p of byId.values()) {
            const videoSrc = typeof p?.videoSrc === 'string' ? p.videoSrc.trim() : '';
            if (!videoSrc) continue;

            const poster = typeof p?.poster === 'string' ? p.poster.trim() : '';

            out.push({
                id: String(p._id),
                slug: String(p.slug || ''),
                title: String(p.title || ''),
                videoSrc,
                poster,
            });
        }
        return out;
    }, [watchBuyProducts]);

    const watchBuyPageSize = 5;
    const watchBuyTotalPages = useMemo(
        () => Math.max(1, Math.ceil(watchBuyVideos.length / watchBuyPageSize)),
        [watchBuyVideos.length]
    );

    useEffect(() => {
        setWatchBuyPage((p) => Math.min(p, Math.max(0, watchBuyTotalPages - 1)));
    }, [watchBuyTotalPages]);

    const watchBuyVisible = useMemo(() => {
        const start = watchBuyPage * watchBuyPageSize;
        return watchBuyVideos.slice(start, start + watchBuyPageSize);
    }, [watchBuyVideos, watchBuyPage]);

    return (
        <div className="stack">
            <section className="fullBleed flush" aria-label="Hero">
                <div className="fullBleedInner">
                    <Hero slides={heroSlides} />
                </div>
            </section>

            <section className="collections" aria-label="Shop by Collection">
                <h2 className="collectionsTitle">Shop by Collection</h2>
                {isAdmin ? (
                    <div className="collectionsAdminHint">
                        Admin: Click the pencil to upload a collection photo. Recommended size: 1000×1000 (1:1).
                    </div>
                ) : null}
                {collectionAdminError ? <div className="collectionsAdminNotice">{collectionAdminError}</div> : null}
                <div className="collectionsGrid">
                    {collectionTiles.map((tile) => (
                        <Link key={tile.id} className="collectionItem" to={tile.to} aria-label={tile.label}>
                            <div className="collectionMedia">
                                <RemoteImage
                                    className="collectionImg"
                                    src={getCollectionImage(tile.id, tile.image)}
                                    alt=""
                                    loading="lazy"
                                />
                                {isAdmin ? (
                                    <>
                                        <button
                                            type="button"
                                            className="collectionEditBtn"
                                            aria-label={`Edit ${tile.label} photo`}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setCollectionAdminError('');
                                                collectionFileRefs.current?.[tile.id]?.click();
                                            }}
                                            disabled={collectionUploadingId === tile.id}
                                        >
                                            <IconPencil />
                                        </button>
                                        <input
                                            ref={(el) => {
                                                if (el) collectionFileRefs.current[tile.id] = el;
                                            }}
                                            type="file"
                                            accept="image/*"
                                            className="collectionEditInput"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                            }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                handleCollectionUpload(tile.id, file);
                                            }}
                                        />
                                    </>
                                ) : null}
                            </div>
                            <div className="collectionLabel">{tile.label}</div>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="fullBleed" aria-label="Featured product listings">
                <div className="fullBleedInner">
                    <div className="homeListings">
                        <div className="homeListing">
                            <div className="row between homeListingHeader">
                                <h2 className="homeListingTitle">Top Sellers</h2>
                            </div>
                            {loading && <div className="muted">Loading…</div>}
                            {error && <div className="error">{error}</div>}
                            {!loading && !error && (
                                <div className="grid grid4">
                                    {topSellers.map((p) => {
                                        const cardImages = getCardImages(p);
                                        const ratingAvg = Number(p.ratingAvg || 0);
                                        const ratingCount = Number(p.ratingCount || 0);
                                        const hasBadges = Boolean(p?.category) || (Array.isArray(p.tags) && p.tags.length > 0);
                                        const badges = [
                                            p?.category ? String(p.category) : '',
                                            ...(Array.isArray(p.tags) ? p.tags.slice(0, 1).map((t) => String(t)) : []),
                                        ].filter(Boolean);
                                        return (
                                            <Link key={p._id} to={`/product/${p.slug}`} className="productCardV2">
                                                <div className={`thumbV2 ${cardImages.secondary ? 'hasAlt' : ''}`}>
                                                    <RemoteImage className="thumbImg primary" src={cardImages.primary} alt={p.title} loading="lazy" />
                                                    {cardImages.secondary ? (
                                                        <RemoteImage className="thumbImg secondary" src={cardImages.secondary} alt="" loading="lazy" />
                                                    ) : null}

                                                    {hasBadges ? (
                                                        <div className="badgeRow">
                                                            {badges.slice(0, 2).map((t) => (
                                                                <span key={t} className="badge">{t}</span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="cardBody">
                                                    <div className="cardTop">
                                                        <div className="cardTitle" title={p.title}>{p.title}</div>
                                                        <div className="cardCategory muted">{p.category}</div>
                                                    </div>

                                                    <div className="ratingRow">
                                                        <Stars value={ratingAvg} />
                                                        <span className="muted ratingText">
                                                            {ratingCount ? `${ratingAvg.toFixed(1)} · ${formatReviewCount(ratingCount)}` : formatReviewCount(ratingCount)}
                                                        </span>
                                                    </div>

                                                    {Array.isArray(p.colors) && p.colors.length > 0 ? (
                                                        <div className="swatchRow" aria-label="Available colors">
                                                            {p.colors
                                                                .filter((c) => c && c.hex)
                                                                .slice(0, 6)
                                                                .map((c, idx) => (
                                                                    <span
                                                                        key={`${c.hex || idx}-${idx}`}
                                                                        title={c.name || c.hex}
                                                                        aria-label={c.name || c.hex}
                                                                        className="swatchDotSmall"
                                                                        style={{ backgroundColor: c.hex }}
                                                                    />
                                                                ))}
                                                        </div>
                                                    ) : null}

                                                    <div className="cardBottom">
                                                        <div className="price">{formatMoney(Number(p.price || 0), p.currency || 'USD')}</div>
                                                        <span className="ctaButton">VIEW</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="homeListing">
                            <div className="row between homeListingHeader">
                                <h2 className="homeListingTitle">New Arrivals</h2>
                            </div>
                            {loading && <div className="muted">Loading…</div>}
                            {error && <div className="error">{error}</div>}
                            {!loading && !error && (
                                <div className="grid grid4">
                                    {newArrivals.map((p) => {
                                        const cardImages = getCardImages(p);
                                        const ratingAvg = Number(p.ratingAvg || 0);
                                        const ratingCount = Number(p.ratingCount || 0);
                                        const hasBadges = Boolean(p?.category) || (Array.isArray(p.tags) && p.tags.length > 0);
                                        const badges = [
                                            p?.category ? String(p.category) : '',
                                            ...(Array.isArray(p.tags) ? p.tags.slice(0, 1).map((t) => String(t)) : []),
                                        ].filter(Boolean);
                                        return (
                                            <Link key={p._id} to={`/product/${p.slug}`} className="productCardV2">
                                                <div className={`thumbV2 ${cardImages.secondary ? 'hasAlt' : ''}`}>
                                                    <RemoteImage className="thumbImg primary" src={cardImages.primary} alt={p.title} loading="lazy" />
                                                    {cardImages.secondary ? (
                                                        <RemoteImage className="thumbImg secondary" src={cardImages.secondary} alt="" loading="lazy" />
                                                    ) : null}

                                                    {hasBadges ? (
                                                        <div className="badgeRow">
                                                            {badges.slice(0, 2).map((t) => (
                                                                <span key={t} className="badge">{t}</span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="cardBody">
                                                    <div className="cardTop">
                                                        <div className="cardTitle" title={p.title}>{p.title}</div>
                                                        <div className="cardCategory muted">{p.category}</div>
                                                    </div>

                                                    <div className="ratingRow">
                                                        <Stars value={ratingAvg} />
                                                        <span className="muted ratingText">
                                                            {ratingCount ? `${ratingAvg.toFixed(1)} · ${formatReviewCount(ratingCount)}` : formatReviewCount(ratingCount)}
                                                        </span>
                                                    </div>

                                                    {Array.isArray(p.colors) && p.colors.length > 0 ? (
                                                        <div className="swatchRow" aria-label="Available colors">
                                                            {p.colors
                                                                .filter((c) => c && c.hex)
                                                                .slice(0, 6)
                                                                .map((c, idx) => (
                                                                    <span
                                                                        key={`${c.hex || idx}-${idx}`}
                                                                        title={c.name || c.hex}
                                                                        aria-label={c.name || c.hex}
                                                                        className="swatchDotSmall"
                                                                        style={{ backgroundColor: c.hex }}
                                                                    />
                                                                ))}
                                                        </div>
                                                    ) : null}

                                                    <div className="cardBottom">
                                                        <div className="price">{formatMoney(Number(p.price || 0), p.currency || 'USD')}</div>
                                                        <span className="ctaButton">VIEW</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="homeListing">
                            <div className="row between homeListingHeader">
                                <h2 className="homeListingTitle">Offers</h2>
                            </div>
                            {loading && <div className="muted">Loading…</div>}
                            {error && <div className="error">{error}</div>}
                            {!loading && !error && (
                                <div className="grid grid4">
                                    {offers.map((p) => {
                                        const cardImages = getCardImages(p);
                                        const ratingAvg = Number(p.ratingAvg || 0);
                                        const ratingCount = Number(p.ratingCount || 0);
                                        const hasBadges = Boolean(p?.category) || (Array.isArray(p.tags) && p.tags.length > 0);
                                        const badges = [
                                            p?.category ? String(p.category) : '',
                                            ...(Array.isArray(p.tags) ? p.tags.slice(0, 1).map((t) => String(t)) : []),
                                        ].filter(Boolean);
                                        return (
                                            <Link key={p._id} to={`/product/${p.slug}`} className="productCardV2">
                                                <div className={`thumbV2 ${cardImages.secondary ? 'hasAlt' : ''}`}>
                                                    <RemoteImage className="thumbImg primary" src={cardImages.primary} alt={p.title} loading="lazy" />
                                                    {cardImages.secondary ? (
                                                        <RemoteImage className="thumbImg secondary" src={cardImages.secondary} alt="" loading="lazy" />
                                                    ) : null}

                                                    {hasBadges ? (
                                                        <div className="badgeRow">
                                                            {badges.slice(0, 2).map((t) => (
                                                                <span key={t} className="badge">{t}</span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="cardBody">
                                                    <div className="cardTop">
                                                        <div className="cardTitle" title={p.title}>{p.title}</div>
                                                        <div className="cardCategory muted">{p.category}</div>
                                                    </div>

                                                    <div className="ratingRow">
                                                        <Stars value={ratingAvg} />
                                                        <span className="muted ratingText">
                                                            {ratingCount ? `${ratingAvg.toFixed(1)} · ${formatReviewCount(ratingCount)}` : formatReviewCount(ratingCount)}
                                                        </span>
                                                    </div>

                                                    {Array.isArray(p.colors) && p.colors.length > 0 ? (
                                                        <div className="swatchRow" aria-label="Available colors">
                                                            {p.colors
                                                                .filter((c) => c && c.hex)
                                                                .slice(0, 6)
                                                                .map((c, idx) => (
                                                                    <span
                                                                        key={`${c.hex || idx}-${idx}`}
                                                                        title={c.name || c.hex}
                                                                        aria-label={c.name || c.hex}
                                                                        className="swatchDotSmall"
                                                                        style={{ backgroundColor: c.hex }}
                                                                    />
                                                                ))}
                                                        </div>
                                                    ) : null}

                                                    <div className="cardBottom">
                                                        <div className="price">{formatMoney(Number(p.price || 0), p.currency || 'USD')}</div>
                                                        <span className="ctaButton">VIEW</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="homeListing">
                            <div className="row between homeListingHeader">
                                <h2 className="homeListingTitle">Limited Edition</h2>
                            </div>
                            {loading && <div className="muted">Loading…</div>}
                            {error && <div className="error">{error}</div>}
                            {!loading && !error && (
                                <div className="grid grid4">
                                    {limitedEdition.map((p) => {
                                        const cardImages = getCardImages(p);
                                        const ratingAvg = Number(p.ratingAvg || 0);
                                        const ratingCount = Number(p.ratingCount || 0);
                                        const hasBadges = Boolean(p?.category) || (Array.isArray(p.tags) && p.tags.length > 0);
                                        const badges = [
                                            p?.category ? String(p.category) : '',
                                            ...(Array.isArray(p.tags) ? p.tags.slice(0, 1).map((t) => String(t)) : []),
                                        ].filter(Boolean);
                                        return (
                                            <Link key={p._id} to={`/product/${p.slug}`} className="productCardV2">
                                                <div className={`thumbV2 ${cardImages.secondary ? 'hasAlt' : ''}`}>
                                                    <RemoteImage className="thumbImg primary" src={cardImages.primary} alt={p.title} loading="lazy" />
                                                    {cardImages.secondary ? (
                                                        <RemoteImage className="thumbImg secondary" src={cardImages.secondary} alt="" loading="lazy" />
                                                    ) : null}

                                                    {hasBadges ? (
                                                        <div className="badgeRow">
                                                            {badges.slice(0, 2).map((t) => (
                                                                <span key={t} className="badge">{t}</span>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="cardBody">
                                                    <div className="cardTop">
                                                        <div className="cardTitle" title={p.title}>{p.title}</div>
                                                        <div className="cardCategory muted">{p.category}</div>
                                                    </div>

                                                    <div className="ratingRow">
                                                        <Stars value={ratingAvg} />
                                                        <span className="muted ratingText">
                                                            {ratingCount ? `${ratingAvg.toFixed(1)} · ${formatReviewCount(ratingCount)}` : formatReviewCount(ratingCount)}
                                                        </span>
                                                    </div>

                                                    {Array.isArray(p.colors) && p.colors.length > 0 ? (
                                                        <div className="swatchRow" aria-label="Available colors">
                                                            {p.colors
                                                                .filter((c) => c && c.hex)
                                                                .slice(0, 6)
                                                                .map((c, idx) => (
                                                                    <span
                                                                        key={`${c.hex || idx}-${idx}`}
                                                                        title={c.name || c.hex}
                                                                        aria-label={c.name || c.hex}
                                                                        className="swatchDotSmall"
                                                                        style={{ backgroundColor: c.hex }}
                                                                    />
                                                                ))}
                                                        </div>
                                                    ) : null}

                                                    <div className="cardBottom">
                                                        <div className="price">{formatMoney(Number(p.price || 0), p.currency || 'USD')}</div>
                                                        <span className="ctaButton">VIEW</span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <section className="watchBuySection" aria-label="Watch and Buy" id="watch-and-buy">
                            <h2 className="watchBuyTitle">Watch and Buy</h2>
                            {watchBuyLoading ? <div className="muted" style={{ textAlign: 'center' }}>Loading…</div> : null}
                            {watchBuyError ? <div className="error" style={{ textAlign: 'center' }}>{watchBuyError}</div> : null}

                            {!watchBuyLoading && !watchBuyError ? (
                                watchBuyVideos.length ? (
                                    <div className="watchBuyCarousel" aria-label="Watch and Buy carousel">
                                        {watchBuyTotalPages > 1 ? (
                                            <div className="watchBuyNav" aria-label="Carousel controls">
                                                <button
                                                    type="button"
                                                    className="watchBuyArrow left"
                                                    onClick={() => setWatchBuyPage((p) => Math.max(0, p - 1))}
                                                    disabled={watchBuyPage <= 0}
                                                    aria-label="Previous"
                                                >
                                                    ‹
                                                </button>
                                                <div className="watchBuyPager" aria-label="Carousel page">
                                                    {watchBuyPage + 1} / {watchBuyTotalPages}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="watchBuyArrow right"
                                                    onClick={() => setWatchBuyPage((p) => Math.min(watchBuyTotalPages - 1, p + 1))}
                                                    disabled={watchBuyPage >= watchBuyTotalPages - 1}
                                                    aria-label="Next"
                                                >
                                                    ›
                                                </button>
                                            </div>
                                        ) : null}

                                        <div className="watchBuyRow" role="list" aria-label="Product videos">
                                            {watchBuyVisible.map((v) => (
                                                <Link key={v.id} to={`/product/${v.slug}`} className="watchBuyCard" role="listitem" aria-label={`View ${v.title}`}>
                                                    <div className="watchBuyMedia">
                                                        <video
                                                            className="watchBuyVideo"
                                                            src={v.videoSrc}
                                                            poster={v.poster || undefined}
                                                            controls
                                                            playsInline
                                                            preload="metadata"
                                                        />
                                                    </div>
                                                    <div className="watchBuyMeta">
                                                        <div className="watchBuyName" title={v.title}>{v.title}</div>
                                                        <span className="watchBuyButton">Buy</span>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="muted" style={{ textAlign: 'center' }}>
                                        No product videos yet. Add a video to the first color of each product in Admin.
                                    </div>
                                )
                            ) : null}
                        </section>

                        <div className="homeListingsFooter">
                            <Link className="button" to="/shop">View All</Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

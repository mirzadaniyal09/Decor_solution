import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import RemoteImage from '../components/RemoteImage.jsx';

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

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function formatReviewCount(n) {
    const count = Number(n || 0);
    if (!Number.isFinite(count) || count <= 0) return 'No reviews';
    if (count === 1) return '1 review';
    return `${count} reviews`;
}

async function fetchAllProducts(filters) {
    const params = new URLSearchParams({ limit: '48', page: '1' });
    for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
    }

    const firstPage = await apiGet(`/api/products?${params}`);
    const items = Array.isArray(firstPage?.items) ? firstPage.items : [];
    const pages = Math.max(1, Number(firstPage?.pages || 1));
    if (pages <= 1) return items;

    const remainingPages = await Promise.all(
        Array.from({ length: pages - 1 }, (_, index) => {
            const pageParams = new URLSearchParams(params);
            pageParams.set('page', String(index + 2));
            return apiGet(`/api/products?${pageParams}`);
        })
    );
    for (const result of remainingPages) {
        if (Array.isArray(result?.items)) items.push(...result.items);
    }
    return items;
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

export default function ShopPage() {
    const [params, setParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [items, setItems] = useState([]);

    const q = useMemo(() => params.get('q') || '', [params]);
    const category = useMemo(() => params.get('category') || '', [params]);
    const tag = useMemo(() => params.get('tag') || '', [params]);
    const sort = useMemo(() => params.get('sort') || '', [params]);

    const isLimitedEdition = useMemo(() => {
        const tags = String(tag || '')
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        return tags.includes('limited-edition');
    }, [tag]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        fetchAllProducts({ q, category, tag, sort })
            .then((products) => {
                if (cancelled) return;
                setItems(products);
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
    }, [q, category, tag, sort]);

    const categories = useMemo(() => {
        const set = new Set();
        (items || []).forEach((p) => {
            if (p?.category) set.add(String(p.category));
        });
        const dynamic = Array.from(set)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));
        return [{ label: 'All', value: '' }, ...dynamic.map((c) => ({ label: c, value: c }))];
    }, [items]);

    const resultCount = items.length;

    return (
        <div className="shopPage">
            <div className="shopHero">
                <div className="shopHeroInner">
                    <div>
                        <div className="shopKicker">Decor Solution</div>
                        <h1 className="shopTitle">
                            {category === 'New Arrivals'
                                ? 'New Arrivals'
                                : category === 'Offers'
                                    ? 'Offers'
                                    : category === 'Top Sellers'
                                        ? 'Top Sellers'
                                        : category === 'Limited Edition'
                                            ? 'Limited Edition'
                                            : isLimitedEdition
                                                ? 'Limited Edition'
                                                : tag === 'offer'
                                                    ? 'Offers'
                                                    : tag === 'top-seller'
                                                        ? 'Top Sellers'
                                                        : sort === 'rating'
                                                            ? 'Top Rated'
                                                            : sort === 'new'
                                                                ? 'New Arrivals'
                                                                : 'Shop'}
                        </h1>
                        <div className="shopSub">
                            Explore curated decor, organizers, and accessories.
                        </div>
                    </div>

                    <form
                        className="shopSearch"
                        onSubmit={(e) => {
                            e.preventDefault();
                            const form = new FormData(e.currentTarget);
                            const next = String(form.get('q') || '').trim();
                            const nextParams = {};
                            if (next) nextParams.q = next;
                            if (category) nextParams.category = category;
                            if (tag) nextParams.tag = tag;
                            if (sort) nextParams.sort = sort;
                            setParams(nextParams);
                        }}
                    >
                        <input name="q" defaultValue={q} placeholder="Search products…" aria-label="Search products" />
                        <button className="button" type="submit">Search</button>
                    </form>
                </div>
            </div>

            <div className="shopToolbar">
                <div className="shopChips" role="list" aria-label="Categories">
                    {categories.map((c) => {
                        const active = (c.value || '') === (category || '');
                        return (
                            <button
                                key={c.label}
                                type="button"
                                className={active ? 'chip active' : 'chip'}
                                onClick={() => {
                                    const nextParams = {};
                                    if (q) nextParams.q = q;
                                    if (c.value) nextParams.category = c.value;
                                    if (tag) nextParams.tag = tag;
                                    if (sort) nextParams.sort = sort;
                                    setParams(nextParams);
                                }}
                            >
                                {c.label}
                            </button>
                        );
                    })}
                </div>

                <div className="shopMetaRow">
                    <div className="muted">{loading ? 'Loading…' : `${resultCount} items`}</div>
                    <label className="shopSort">
                        <span className="muted">Sort</span>
                        <select
                            value={sort}
                            onChange={(e) => {
                                const nextSort = String(e.target.value || '');
                                const nextParams = {};
                                if (q) nextParams.q = q;
                                if (category) nextParams.category = category;
                                if (tag) nextParams.tag = tag;
                                if (nextSort) nextParams.sort = nextSort;
                                setParams(nextParams);
                            }}
                        >
                            <option value="">Newest</option>
                            <option value="new">New arrivals</option>
                            <option value="rating">Top rated</option>
                        </select>
                    </label>
                </div>
            </div>

            {error ? <div className="error">{error}</div> : null}

            <div className="shopGrid">
                {items.map((p) => {
                    const cardImages = getCardImages(p);
                    const ratingAvg = Number(p.ratingAvg || 0);
                    const ratingCount = Number(p.ratingCount || 0);
                    const latestComment = String(p.latestReview?.comment || '').trim();
                    const hasTags = Array.isArray(p.tags) && p.tags.length > 0;
                    return (
                        <Link key={p._id} to={`/product/${p.slug}`} className="productCardV2">
                            <div className={`thumbV2 ${cardImages.secondary ? 'hasAlt' : ''}`}>
                                <RemoteImage className="thumbImg primary" src={cardImages.primary} alt={p.title} loading="lazy" />
                                {cardImages.secondary ? (
                                    <RemoteImage className="thumbImg secondary" src={cardImages.secondary} alt="" loading="lazy" />
                                ) : null}

                                {hasTags ? (
                                    <div className="badgeRow">
                                        {p.tags.slice(0, 2).map((t) => (
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

                                {latestComment ? (
                                    <div className="reviewSnippet">“{latestComment}”</div>
                                ) : null}

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
                                    <div className="price">${Number(p.price).toFixed(2)}</div>
                                    <span className="cta">View</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                {!loading && !error && items.length === 0 ? (
                    <div className="muted">No products found.</div>
                ) : null}
            </div>
        </div>
    );
}

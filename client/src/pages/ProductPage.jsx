import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiDelete, apiGet, apiPost } from '../lib/api.js';
import ProductGallery from '../components/ProductGallery.jsx';
import { getStoredUser } from '../lib/auth.js';
import RemoteImage from '../components/RemoteImage.jsx';

function normalizeColors(colors) {
    if (!Array.isArray(colors)) return [];
    const normalized = colors
        .map((c) => {
            if (!c) return null;
            if (typeof c === 'string') {
                const name = c.trim();
                if (!name) return null;
                return { name, hex: '', qty: 0, media: [] };
            }
            const name = String(c.name || '').trim();
            const hex = String(c.hex || '').trim();
            if (!name && !hex) return null;
            const qtyNum = Number(c.qty);
            const qty = Number.isFinite(qtyNum) && qtyNum >= 0 ? Math.floor(qtyNum) : 0;
            const media = Array.isArray(c.media) ? c.media : [];
            return { name: name || hex || 'Color', hex, qty, media };
        })
        .filter(Boolean);
    const unique = [];
    const seen = new Set();
    for (const item of normalized) {
        const key = `${item.name}|${item.hex}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
    }
    return unique;
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function Stars({ value, className = '' }) {
    const rating = clamp(Number(value || 0), 0, 5);
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    const empty = 5 - full - (half ? 1 : 0);
    const stars = [
        ...Array.from({ length: full }).map(() => '★'),
        ...(half ? ['⯪'] : []),
        ...Array.from({ length: empty }).map(() => '☆'),
    ].join('');
    return (
        <span className={`ratingStars ${className}`.trim()} aria-label={`Rating ${rating} out of 5`}>
            {stars}
        </span>
    );
}

function formatReviewCount(n) {
    const count = Number(n || 0);
    if (!Number.isFinite(count) || count <= 0) return 'No reviews';
    if (count === 1) return '1 review';
    return `${count} reviews`;
}

function formatDate(iso) {
    const d = iso ? new Date(iso) : null;
    if (!d || Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

export default function ProductPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [product, setProduct] = useState(null);
    const [selectedColorIdx, setSelectedColorIdx] = useState(0);
    const [reviewName, setReviewName] = useState('');
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [reviewPhotos, setReviewPhotos] = useState([]);
    const [reviewPhotoPreviews, setReviewPhotoPreviews] = useState([]);
    const [reviewSaving, setReviewSaving] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewSort, setReviewSort] = useState('recent');
    const reviewAnchorRef = useRef(null);
    const [qty, setQty] = useState(1);
    const [cartMsg, setCartMsg] = useState('');
    const [cartErr, setCartErr] = useState('');

    const [alsoLikeLoading, setAlsoLikeLoading] = useState(false);
    const [alsoLikeError, setAlsoLikeError] = useState('');
    const [alsoLikeItems, setAlsoLikeItems] = useState([]);

    const colors = useMemo(() => normalizeColors(product?.colors), [product]);
    const selectedColor = colors[selectedColorIdx] || colors[0] || null;

    const selectedMedia = useMemo(() => (Array.isArray(selectedColor?.media) ? selectedColor.media : []), [selectedColor]);

    const selectedColorQty = useMemo(() => {
        const n = Number(selectedColor?.qty);
        return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
    }, [selectedColor]);

    const isAvailable = selectedColorQty !== null ? selectedColorQty > 0 : Boolean(product?.inStock);
    const selectedColorImageSrc = useMemo(() => {
        const media = Array.isArray(selectedColor?.media) ? selectedColor.media : [];
        const img = media.find((m) => m?.type === 'image' && typeof m?.src === 'string' && m.src.trim());
        return img?.src ? img.src.trim() : '';
    }, [selectedColor]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');
        setReviewError('');
        setReviewSuccess('');
        setShowReviewForm(false);
        setReviewSort('recent');
        setReviewPhotos([]);
        setReviewPhotoPreviews([]);
        setCartErr('');
        setCartMsg('');
        setQty(1);
        apiGet(`/api/products/${encodeURIComponent(slug)}`)
            .then((data) => {
                if (cancelled) return;
                setProduct(data.product);
                setSelectedColorIdx(0);
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
    }, [slug]);

    useEffect(() => {
        let cancelled = false;
        if (!product?._id) {
            setAlsoLikeItems([]);
            setAlsoLikeError('');
            setAlsoLikeLoading(false);
            return () => {
                cancelled = true;
            };
        }

        const category = String(product?.category || '').trim();
        setAlsoLikeLoading(true);
        setAlsoLikeError('');

        apiGet(`/api/products?limit=12${category ? `&category=${encodeURIComponent(category)}` : ''}`)
            .then((data) => {
                if (cancelled) return;
                const items = Array.isArray(data?.items) ? data.items : [];
                const filtered = items.filter((p) => String(p?._id || '') && String(p._id) !== String(product._id));
                setAlsoLikeItems(filtered.slice(0, 8));
            })
            .catch((e) => {
                if (cancelled) return;
                setAlsoLikeError(e?.message || 'Failed to load suggestions');
            })
            .finally(() => {
                if (cancelled) return;
                setAlsoLikeLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [product?._id, product?.category]);

    useEffect(() => {
        return () => {
            reviewPhotoPreviews.forEach((u) => {
                try {
                    URL.revokeObjectURL(u);
                } catch {
                    // ignore
                }
            });
        };
    }, [reviewPhotoPreviews]);

    const storedUser = getStoredUser();
    const currentUserId = storedUser?.id ? String(storedUser.id) : '';
    const currentUserRole = storedUser?.role ? String(storedUser.role) : '';

    const ratingAvg = Number(product?.ratingAvg || 0);
    const ratingCount = Number(product?.ratingCount || 0);
    const compareAt = product?.compareAtPrice !== undefined && product?.compareAtPrice !== null ? Number(product.compareAtPrice) : 0;

    const reviews = useMemo(() => {
        const list = Array.isArray(product?.reviews) ? [...product.reviews] : [];
        return list.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    }, [product]);

    const ratingBuckets = useMemo(() => {
        const buckets = [0, 0, 0, 0, 0];
        reviews.forEach((r) => {
            const rating = clamp(Number(r?.rating || 0), 1, 5);
            buckets[rating - 1] += 1;
        });
        const total = reviews.length;
        return { buckets, total };
    }, [reviews]);

    const sortedReviews = useMemo(() => {
        const list = [...reviews];
        if (reviewSort === 'highest') {
            return list.sort((a, b) => Number(b?.rating || 0) - Number(a?.rating || 0) || new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
        }
        if (reviewSort === 'lowest') {
            return list.sort((a, b) => Number(a?.rating || 0) - Number(b?.rating || 0) || new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
        }
        return list;
    }, [reviews, reviewSort]);

    if (loading) return <div className="muted">Loading…</div>;
    if (error) return <div className="error">{error}</div>;
    if (!product) return <div className="muted">Not found</div>;

    function clampQty(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 1;
        return Math.max(1, Math.min(99, Math.floor(n)));
    }

    function readCart() {
        try {
            const raw = localStorage.getItem('cart');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function writeCart(items) {
        try {
            localStorage.setItem('cart', JSON.stringify(items));
        } catch {
            // ignore
        }
        try {
            window.dispatchEvent(new Event('cart:changed'));
        } catch {
            // ignore
        }
    }

    function addToCart({ immediate = false, goToCheckout = false, payment = '' } = {}) {
        setCartErr('');
        setCartMsg('');

        const quantity = clampQty(qty);
        const colorName = selectedColor?.name || '';
        const colorHex = selectedColor?.hex || '';
        const selectedColorImage = Array.isArray(selectedColor?.media)
            ? selectedColor.media.find((m) => m?.type === 'image' && m?.src)?.src
            : '';
        const productImage = Array.isArray(product?.images) ? product.images.find(Boolean) : '';

        try {
            const cart = readCart();
            const key = `${product._id}|${colorName}|${colorHex}`;
            const idx = cart.findIndex((x) => String(x?.key || '') === key);
            const nextItem = {
                key,
                productId: product._id,
                slug: product.slug,
                title: product.title,
                price: Number(product.price || 0),
                currency: product.currency || 'USD',
                colorName,
                colorHex,
                qty: quantity,
                image: String(selectedColorImage || productImage || ''),
            };

            if (idx >= 0) {
                const existing = cart[idx];
                cart[idx] = { ...existing, qty: clampQty(Number(existing?.qty || 0) + quantity) };
            } else {
                cart.push(nextItem);
            }

            writeCart(cart);
            setCartMsg(immediate ? 'Added to cart.' : 'Added to cart.');
            if (goToCheckout) {
                const q = payment ? `?payment=${encodeURIComponent(payment)}` : '';
                navigate(`/checkout${q}`);
            }
        } catch (e) {
            setCartErr(e?.message || 'Failed to add to cart');
        }
    }

    async function submitReview(e) {
        e.preventDefault();
        setReviewError('');
        setReviewSuccess('');

        const ratingNum = Number(reviewRating);
        if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            setReviewError('Please select a rating from 1 to 5.');
            return;
        }

        setReviewSaving(true);
        try {
            const hasPhotos = Array.isArray(reviewPhotos) && reviewPhotos.length > 0;
            if (hasPhotos) {
                const fd = new FormData();
                if (reviewName.trim()) fd.append('name', reviewName.trim());
                fd.append('rating', String(ratingNum));
                if (reviewComment.trim()) fd.append('comment', reviewComment.trim());
                reviewPhotos.forEach((f) => fd.append('photos', f));
                await apiPost(`/api/products/${product._id}/reviews`, fd);
            } else {
                await apiPost(`/api/products/${product._id}/reviews`, {
                    name: reviewName.trim() ? reviewName.trim() : undefined,
                    rating: ratingNum,
                    comment: reviewComment.trim() ? reviewComment.trim() : undefined,
                });
            }

            const data = await apiGet(`/api/products/${encodeURIComponent(slug)}`);
            setProduct(data.product);
            setReviewName('');
            setReviewRating(5);
            setReviewComment('');
            setReviewPhotos([]);
            reviewPhotoPreviews.forEach((u) => {
                try {
                    URL.revokeObjectURL(u);
                } catch {
                    // ignore
                }
            });
            setReviewPhotoPreviews([]);
            setReviewSuccess('Thanks! Your review has been submitted.');
        } catch (err) {
            setReviewError(err?.message || 'Failed to submit review');
        } finally {
            setReviewSaving(false);
        }
    }

    async function deleteReview(reviewId) {
        if (!reviewId) return;
        const ok = window.confirm('Delete this review?');
        if (!ok) return;

        setReviewError('');
        setReviewSuccess('');
        try {
            await apiDelete(`/api/products/${product._id}/reviews/${reviewId}`);
            const data = await apiGet(`/api/products/${encodeURIComponent(slug)}`);
            setProduct(data.product);
            setReviewSuccess('Review deleted.');
        } catch (err) {
            setReviewError(err?.message || 'Failed to delete review');
        }
    }

    function onPickReviewPhotos(e) {
        const files = Array.from(e.target.files || []);
        const next = files.slice(0, 5);

        reviewPhotoPreviews.forEach((u) => {
            try {
                URL.revokeObjectURL(u);
            } catch {
                // ignore
            }
        });

        setReviewPhotos(next);
        setReviewPhotoPreviews(next.map((f) => URL.createObjectURL(f)));
    }

    function openReviewForm() {
        setShowReviewForm(true);
        const anchor = reviewAnchorRef.current;
        if (anchor) {
            setTimeout(() => {
                anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 30);
        }
    }

    return (
        <div className="stack">
            <Link to="/shop" className="muted">← Back to shop</Link>

            <div className="productDetail">
                <div className="detailMedia">
                    <ProductGallery media={selectedMedia} images={product.images} title={product.title} />
                </div>
                <div className="detailInfo">
                    <h1>{product.title}</h1>
                    <div className="muted">{product.category}</div>
                    <div className="detailRatingRow">
                        <Stars value={ratingAvg} className="ratingStarsLg" />
                        <span className="muted">{ratingCount ? `${ratingAvg.toFixed(1)} · ${formatReviewCount(ratingCount)}` : formatReviewCount(ratingCount)}</span>
                    </div>
                    <div className="priceRow">
                        <div className="priceLg">${Number(product.price).toFixed(2)}</div>
                        {Number.isFinite(compareAt) && compareAt > Number(product.price || 0) ? (
                            <div className="priceCompare">${compareAt.toFixed(2)}</div>
                        ) : null}
                    </div>

                    {colors.length > 0 ? (
                        <div className="variantBlock" aria-label="Choose color">
                            <div className="variantHeader">
                                <div className="variantLabel">Color</div>
                                <div className="muted variantValue">{selectedColor?.name}</div>
                            </div>

                            <div className="swatches">
                                {colors.map((c, idx) => {
                                    const isActive = idx === selectedColorIdx;
                                    const swatchStyle = c.hex ? { '--swatch': c.hex } : undefined;
                                    return (
                                        <button
                                            key={`${c.name}-${c.hex}-${idx}`}
                                            type="button"
                                            className={`swatch ${isActive ? 'active' : ''}`}
                                            onClick={() => setSelectedColorIdx(idx)}
                                            aria-label={c.name}
                                            aria-pressed={isActive}
                                            style={swatchStyle}
                                            title={c.name}
                                        >
                                            <span className={`swatchDot ${c.hex ? '' : 'swatchText'}`}>
                                                {c.hex ? '' : c.name.slice(0, 2).toUpperCase()}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <div className="purchaseBlock" aria-label="Purchase options">
                        <div className="qtyRow">
                            <div className="qtyLabel muted">Quantity</div>
                            <div className="qtyControl" role="group" aria-label="Quantity selector">
                                <button
                                    type="button"
                                    className="qtyBtn"
                                    onClick={() => setQty((v) => clampQty(v - 1))}
                                    aria-label="Decrease quantity"
                                >
                                    −
                                </button>
                                <div className="qtyValue" aria-label={`Quantity ${clampQty(qty)}`}>{clampQty(qty)}</div>
                                <button
                                    type="button"
                                    className="qtyBtn"
                                    onClick={() => setQty((v) => clampQty(v + 1))}
                                    aria-label="Increase quantity"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {cartErr ? <div className="error">{cartErr}</div> : null}
                        {cartMsg ? <div className="success">{cartMsg}</div> : null}

                        {!isAvailable ? <div className="error">Out of stock for this color.</div> : null}

                        <div className="purchaseActions">
                            <button type="button" className="purchaseBtn purchaseBtnPrimary" onClick={() => addToCart({ immediate: false })} disabled={!isAvailable}>
                                Add to cart
                            </button>
                            <button type="button" className="purchaseBtn purchaseBtnSecondary" onClick={() => addToCart({ immediate: true, goToCheckout: true, payment: 'cod' })} disabled={!isAvailable}>
                                Buy it now
                            </button>
                            <button type="button" className="purchaseBtn purchaseBtnPay" onClick={() => addToCart({ immediate: true, goToCheckout: true, payment: 'bank' })} disabled={!isAvailable}>
                                Pay In Advance &amp; Get Rs. 250 OFF
                            </button>
                        </div>
                    </div>

                    {product.description ? <p>{product.description}</p> : null}

                    <section className="reviewsSection" aria-label="Customer reviews">
                        <div ref={reviewAnchorRef} className="reviewAnchor" />

                        <div className="reviewsCard">
                            <div className="reviewsHeader">
                                <div className="reviewsHeaderText">
                                    <h2 className="reviewsTitle">Customer Reviews</h2>
                                    <div className="reviewsSummary">
                                        <Stars value={ratingAvg} className="ratingStarsLg" />
                                        <div className="reviewsSummaryText">
                                            <div className="reviewsScore">{ratingCount ? ratingAvg.toFixed(2) : '—'}</div>
                                            <div className="muted">Based on {formatReviewCount(ratingCount)}</div>
                                        </div>
                                    </div>
                                </div>

                                <button type="button" className="reviewCta" onClick={openReviewForm}>
                                    Write a review
                                </button>
                            </div>

                            <div className="ratingPanel" aria-label="Rating summary">
                                <div className="ratingSummaryCard">
                                    <div className="ratingNumber">{ratingCount ? ratingAvg.toFixed(2) : '—'}</div>
                                    <Stars value={ratingAvg} className="ratingStarsLg" />
                                    <div className="ratingCount muted">{ratingCount ? formatReviewCount(ratingCount) : 'No reviews yet'}</div>
                                </div>

                                <div className="ratingDistribution" aria-label="Rating breakdown">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = ratingBuckets.buckets[star - 1] || 0;
                                        const percent = ratingBuckets.total ? Math.round((count / ratingBuckets.total) * 100) : 0;
                                        return (
                                            <div className="ratingBreakdownRow" key={star}>
                                                <div className="ratingBreakdownLabel">
                                                    <Stars value={star} className="ratingStarsSm" />
                                                </div>
                                                <div className="ratingBar" aria-hidden="true">
                                                    <div className="ratingBarFill" style={{ width: `${percent}%` }} />
                                                </div>
                                                <div className="ratingBreakdownCount">{count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {showReviewForm ? (
                                <form className="reviewForm" onSubmit={submitReview}>
                                    <div className="reviewFormGrid">
                                        <label className="reviewField">
                                            <span className="authLabel">Name (optional)</span>
                                            <input
                                                value={reviewName}
                                                onChange={(e) => setReviewName(e.target.value)}
                                                placeholder="Your name"
                                                disabled={reviewSaving}
                                            />
                                        </label>

                                        <label className="reviewField">
                                            <span className="authLabel">Rating</span>
                                            <select
                                                value={String(reviewRating)}
                                                onChange={(e) => setReviewRating(Number(e.target.value))}
                                                disabled={reviewSaving}
                                            >
                                                <option value="5">5 - Excellent</option>
                                                <option value="4">4 - Good</option>
                                                <option value="3">3 - Okay</option>
                                                <option value="2">2 - Poor</option>
                                                <option value="1">1 - Bad</option>
                                            </select>
                                        </label>
                                    </div>

                                    <label className="reviewField">
                                        <span className="authLabel">Comment (optional)</span>
                                        <textarea
                                            value={reviewComment}
                                            onChange={(e) => setReviewComment(e.target.value)}
                                            placeholder="Share your experience…"
                                            rows={4}
                                            disabled={reviewSaving}
                                        />
                                    </label>

                                    <label className="reviewField">
                                        <span className="authLabel">Photos (optional)</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={onPickReviewPhotos}
                                            disabled={reviewSaving}
                                        />
                                        {reviewPhotoPreviews.length ? (
                                            <div className="reviewPhotoGrid" aria-label="Selected photos">
                                                {reviewPhotoPreviews.map((src) => (
                                                    <img key={src} src={src} alt="" className="reviewPhotoThumb" />
                                                ))}
                                            </div>
                                        ) : null}
                                    </label>

                                    {reviewError ? <div className="error">{reviewError}</div> : null}
                                    {reviewSuccess ? <div className="success">{reviewSuccess}</div> : null}

                                    <div className="reviewActions">
                                        <button className="button" type="submit" disabled={reviewSaving}>
                                            {reviewSaving ? 'Submitting…' : 'Submit Review'}
                                        </button>
                                        <button
                                            type="button"
                                            className="button buttonGhost"
                                            onClick={() => setShowReviewForm(false)}
                                            disabled={reviewSaving}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="reviewFormPlaceholder">
                                    <div className="muted">Share your experience to help others decide.</div>
                                    <button type="button" className="reviewGhostBtn" onClick={openReviewForm}>
                                        Start your review
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="reviewToolbar">
                            <div className="muted">{ratingCount ? formatReviewCount(ratingCount) : 'No reviews yet'}</div>
                            <label className="reviewSort">
                                <span className="muted">Sort</span>
                                <select value={reviewSort} onChange={(e) => setReviewSort(e.target.value)}>
                                    <option value="recent">Most Recent</option>
                                    <option value="highest">Highest Rated</option>
                                    <option value="lowest">Lowest Rated</option>
                                </select>
                            </label>
                        </div>

                        <div className="reviewList" aria-label="Review list">
                            {sortedReviews.length === 0 ? (
                                <div className="muted">No reviews yet. Be the first to review this product.</div>
                            ) : (
                                sortedReviews.map((r, idx) => {
                                    const name = r?.name || 'Anonymous';
                                    const initial = name.trim().charAt(0).toUpperCase() || 'A';
                                    const reviewId = r?._id ? String(r._id) : '';
                                    const ownerId = r?.userId ? String(r.userId) : '';
                                    const canDelete = Boolean(
                                        (currentUserRole === 'admin') || (currentUserId && ownerId && currentUserId === ownerId)
                                    );
                                    const photos = Array.isArray(r?.photos) ? r.photos.filter(Boolean) : [];
                                    return (
                                        <div key={`${r?.createdAt || idx}-${idx}`} className="reviewItem">
                                            <div className="reviewer">
                                                <div className="reviewAvatar" aria-hidden="true">{initial}</div>
                                                <div className="reviewHeader">
                                                    <div className="reviewName">{name}</div>
                                                    <div className="reviewMeta muted">
                                                        <Stars value={Number(r?.rating || 0)} />
                                                        {r?.createdAt ? <span>{formatDate(r.createdAt)}</span> : null}
                                                        {canDelete && reviewId ? (
                                                            <button
                                                                type="button"
                                                                className="reviewDeleteBtn"
                                                                onClick={() => deleteReview(reviewId)}
                                                            >
                                                                Delete
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                            {r?.comment ? <div className="reviewComment">{r.comment}</div> : null}
                                            {photos.length ? (
                                                <div className="reviewPhotoGrid" aria-label="Review photos">
                                                    {photos.map((src) => (
                                                        <img key={src} src={src} alt="" className="reviewPhotoThumb" loading="lazy" />
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <section className="alsoLikeSection" aria-label="You may also like">
                <div className="alsoLikeHeader">
                    <h2 className="alsoLikeTitle">You may also like</h2>
                    <Link
                        className="muted"
                        to={`/shop${product?.category ? `?category=${encodeURIComponent(product.category)}` : ''}`}
                    >
                        View all
                    </Link>
                </div>

                {alsoLikeError ? <div className="error">{alsoLikeError}</div> : null}
                {alsoLikeLoading ? <div className="muted">Loading…</div> : null}

                {!alsoLikeLoading && !alsoLikeError && alsoLikeItems.length > 0 ? (
                    <div className="shopGrid alsoLikeGrid">
                        {alsoLikeItems.map((p) => {
                            const cardImages = getCardImages(p);
                            const ratingAvg2 = Number(p.ratingAvg || 0);
                            const ratingCount2 = Number(p.ratingCount || 0);
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
                                            <Stars value={ratingAvg2} />
                                            <span className="muted ratingText">
                                                {ratingCount2 ? `${ratingAvg2.toFixed(1)} · ${formatReviewCount(ratingCount2)}` : formatReviewCount(ratingCount2)}
                                            </span>
                                        </div>

                                        <div className="cardBottom">
                                            <div className="price">${Number(p.price).toFixed(2)}</div>
                                            <span className="cta">View</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : null}
            </section>
        </div>
    );
}

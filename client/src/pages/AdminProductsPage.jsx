import { useEffect, useMemo, useState } from 'react';
import { apiDelete, apiGet, apiPost, apiPut } from '../lib/api.js';
import { uploadMediaFiles } from '../lib/uploads.js';

const CATEGORIES = ['New Arrivals', 'Offers', 'Top Sellers', 'Limited Edition'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED'];
const AVAILABLE_TAGS = ['New Arrival', 'Best Seller', 'Top Rated', 'Sale', 'Limited Edition', 'Handmade', 'Eco-Friendly', 'Trending', 'Featured', 'Exclusive', 'Turkish', 'Printed', 'Plain', 'Luxury'];

const defaultColorInput = { name: '', hex: '#000000', qty: 0 };

function normalizeCategory(value) {
    const v = String(value || '').trim();
    return CATEGORIES.includes(v) ? v : CATEGORIES[0];
}

const createEmptyDraft = () => ({
    title: '',
    description: '',
    images: [],
    price: '',
    compareAtPrice: '',
    currency: CURRENCIES[0],
    category: CATEGORIES[0],
    tags: '',
    colors: [],
});

function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
}

export default function AdminProductsPage() {
    const [items, setItems] = useState([]);
    const [stats, setStats] = useState({ totalProducts: 0, inStock: 0, categories: 0, avgPrice: 0 });
    const [categoryDistribution, setCategoryDistribution] = useState([]);

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersError, setOrdersError] = useState('');
    const [orderStatusFilter, setOrderStatusFilter] = useState('all');
    const [orderStatusDrafts, setOrderStatusDrafts] = useState({});
    const [orderStatusSavingId, setOrderStatusSavingId] = useState('');

    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [q, setQ] = useState('');
    const [editingId, setEditingId] = useState('');
    const [draft, setDraft] = useState(createEmptyDraft());
    const [colorInput, setColorInput] = useState(defaultColorInput);

    const isEditing = Boolean(editingId);

    const groupedProducts = useMemo(() => {
        const groups = {};
        items.forEach((p) => {
            const key = p.category || 'Uncategorized';
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return groups;
    }, [items]);

    useEffect(() => {
        refresh();
        refreshOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function refresh() {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (q.trim()) params.set('q', q.trim());
            const { items: fetched = [] } = await apiGet(`/api/products${params.toString() ? `?${params.toString()}` : ''}`);
            setItems(fetched);

            const totalProducts = fetched.length;
            const inStock = fetched.filter((p) => p.inStock).length;
            const categories = new Set(fetched.map((p) => p.category || 'Uncategorized'));
            const avgPrice = totalProducts ? fetched.reduce((sum, p) => sum + Number(p.price || 0), 0) / totalProducts : 0;
            const distribution = Array.from(categories).map((name) => {
                const count = fetched.filter((p) => (p.category || 'Uncategorized') === name).length;
                const percentage = totalProducts ? Math.round((count / totalProducts) * 100) : 0;
                return { name, count, percentage };
            });

            setStats({ totalProducts, inStock, categories: categories.size, avgPrice });
            setCategoryDistribution(distribution);
        } catch (e) {
            setError(e?.message || 'Failed to load');
        } finally {
            setLoading(false);
        }
    }

    async function refreshOrders() {
        setOrdersLoading(true);
        setOrdersError('');
        try {
            const data = await apiGet('/api/orders/admin');
            setOrders(Array.isArray(data?.orders) ? data.orders : []);
        } catch (e) {
            setOrdersError(e?.message || 'Failed to load orders');
        } finally {
            setOrdersLoading(false);
        }
    }

    function normalizeStatusForUi(status) {
        const s = String(status || '').toLowerCase().trim();
        return s === 'paid' ? 'delivered' : (s || 'pending');
    }

    async function updateOrderStatus(orderId, uiStatus) {
        const next = normalizeStatusForUi(uiStatus);
        setOrdersError('');
        setOrderStatusSavingId(String(orderId));
        try {
            const saved = await apiPut(`/api/orders/admin/${encodeURIComponent(orderId)}/status`, { status: next });
            const savedStatus = normalizeStatusForUi(saved?.order?.status);

            setOrders((prev) =>
                (Array.isArray(prev) ? prev : []).map((o) =>
                    String(o?._id) === String(orderId)
                        ? { ...o, status: savedStatus }
                        : o
                )
            );

            setOrderStatusDrafts((prev) => {
                const nextDrafts = { ...(prev || {}) };
                delete nextDrafts[String(orderId)];
                return nextDrafts;
            });
        } catch (e) {
            setOrdersError(e?.message || 'Failed to update order status');
        } finally {
            setOrderStatusSavingId('');
        }
    }

    const normalizedOrders = useMemo(() => {
        const list = Array.isArray(orders) ? orders : [];
        return list.map((o) => {
            const status = String(o?.status || 'pending').toLowerCase();
            // Treat legacy 'paid' as delivered for UI grouping.
            const uiStatus = normalizeStatusForUi(status);
            return { ...o, __uiStatus: uiStatus };
        });
    }, [orders]);

    const orderCounts = useMemo(() => {
        const counts = { all: 0, pending: 0, shipped: 0, delivered: 0, cancelled: 0 };
        for (const o of normalizedOrders) {
            counts.all += 1;
            const s = o.__uiStatus;
            if (s === 'pending') counts.pending += 1;
            else if (s === 'shipped') counts.shipped += 1;
            else if (s === 'delivered') counts.delivered += 1;
            else if (s === 'cancelled') counts.cancelled += 1;
        }
        return counts;
    }, [normalizedOrders]);

    const filteredOrders = useMemo(() => {
        if (!orderStatusFilter || orderStatusFilter === 'all') return normalizedOrders;
        return normalizedOrders.filter((o) => o.__uiStatus === orderStatusFilter);
    }, [normalizedOrders, orderStatusFilter]);

    function formatMoney(currency, value) {
        const c = String(currency || 'USD');
        const n = Number(value || 0);
        return `${c} ${Number.isFinite(n) ? n.toFixed(2) : '0.00'}`;
    }

    function formatDate(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString();
    }

    function formatAddress(address) {
        if (!address || typeof address !== 'object') return '';
        const name = [address.firstName, address.lastName].filter(Boolean).join(' ').trim();
        const line1 = String(address.address1 || '').trim();
        const line2 = String(address.address2 || '').trim();
        const city = String(address.city || '').trim();
        const postal = String(address.postalCode || '').trim();
        const country = String(address.country || '').trim();
        const phone = String(address.phone || '').trim();

        const parts = [];
        if (name) parts.push(name);
        if (line1) parts.push(line1);
        if (line2) parts.push(line2);
        const cityLine = [city, postal].filter(Boolean).join(' ').trim();
        if (cityLine) parts.push(cityLine);
        if (country) parts.push(country);
        if (phone) parts.push(`Phone: ${phone}`);
        return parts.join('\n');
    }

    function resetForm() {
        setEditingId('');
        setDraft(createEmptyDraft());
        setColorInput(defaultColorInput);
    }

    function startEdit(id) {
        const product = items.find((p) => p._id === id);
        if (!product) return;
        setEditingId(id);
        setActiveTab('products');
        setDraft({
            title: product.title || '',
            description: product.description || '',
            images: [],
            price: product.price ?? '',
            compareAtPrice: product.compareAtPrice ?? '',
            currency: product.currency || CURRENCIES[0],
            category: normalizeCategory(product.category),
            tags: Array.isArray(product.tags) ? product.tags.join(', ') : '',
            colors: product.colors || [],
        });
    }

    async function onSave(e) {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const payload = {
                title: draft.title,
                description: draft.description,
                images: [],
                price: toNumber(draft.price),
                compareAtPrice: draft.compareAtPrice === '' ? undefined : toNumber(draft.compareAtPrice),
                currency: draft.currency,
                category: normalizeCategory(draft.category),
                tags: String(draft.tags || '')
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                colors: draft.colors,
            };

            const createdNew = !isEditing;

            if (isEditing) {
                await apiPut(`/api/products/admin/${editingId}`, payload);
            } else {
                await apiPost('/api/products', payload);
            }

            resetForm();
            await refresh();

            // After an add-product session, show and refresh customer orders.
            await refreshOrders();
            if (createdNew) setActiveTab('orders');
        } catch (e) {
            setError(e?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    }

    async function onDelete(id) {
        // eslint-disable-next-line no-alert
        const ok = window.confirm('Delete this product? This cannot be undone.');
        if (!ok) return;

        setError('');
        setSaving(true);
        try {
            await apiDelete(`/api/products/admin/${id}`);
            if (editingId === id) resetForm();
            await refresh();
        } catch (e) {
            setError(e?.message || 'Delete failed');
        } finally {
            setSaving(false);
        }
    }

    function generateColorFromName(name) {
        const colorMap = {
            navy: '#000080',
            blue: '#0000FF',
            black: '#000000',
            white: '#FFFFFF',
            red: '#FF0000',
            green: '#008000',
            lime: '#00FF00',
            yellow: '#FFFF00',
            orange: '#FFA500',
            purple: '#800080',
            pink: '#FFC0CB',
            brown: '#A52A2A',
            gray: '#808080',
            grey: '#808080',
            beige: '#F5F5DC',
            cream: '#FFFDD0',
            sage: '#9DC183',
            maroon: '#800000',
            teal: '#008080',
            gold: '#FFD700',
            silver: '#C0C0C0',
            coral: '#FF7F50',
            turquoise: '#40E0D0',
            lavender: '#E6E6FA',
            olive: '#808000',
            burgundy: '#800020',
        };

        const lowerName = name.toLowerCase().trim();

        for (const [key, value] of Object.entries(colorMap)) {
            if (lowerName.includes(key)) {
                return value;
            }
        }

        let hash = 0;
        for (let i = 0; i < lowerName.length; i++) {
            hash = lowerName.charCodeAt(i) + ((hash << 5) - hash);
        }
        return `#${((hash & 0x00ffffff) | 0x404040).toString(16).padStart(6, '0').toUpperCase()}`;
    }

    function handleColorNameChange(name) {
        const generatedHex = generateColorFromName(name);
        setColorInput((c) => ({ ...c, name, hex: generatedHex }));
    }

    function parseQty(value) {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.floor(n);
    }

    function addColor() {
        if (!colorInput.name.trim()) {
            alert('Please enter a color name');
            return;
        }

        setDraft((d) => ({
            ...d,
            colors: [...d.colors, { name: colorInput.name.trim(), hex: colorInput.hex, qty: parseQty(colorInput.qty), media: [] }],
        }));
        setColorInput(defaultColorInput);
    }

    function updateColorName(index, name) {
        const generatedHex = generateColorFromName(name);
        setDraft((d) => {
            const colors = [...d.colors];
            colors[index] = { ...colors[index], name, hex: generatedHex };
            return { ...d, colors };
        });
    }

    function updateColorHex(index, hex) {
        setDraft((d) => {
            const colors = [...d.colors];
            colors[index] = { ...colors[index], hex };
            return { ...d, colors };
        });
    }

    function updateColorQty(index, qty) {
        setDraft((d) => {
            const colors = [...d.colors];
            colors[index] = { ...colors[index], qty: parseQty(qty) };
            return { ...d, colors };
        });
    }

    function removeColor(index) {
        setDraft((d) => ({
            ...d,
            colors: d.colors.filter((_, i) => i !== index),
        }));
    }

    async function addColorMedia(index, files) {
        const fileList = Array.from(files || []).filter(Boolean);
        if (!fileList.length) return;

        setError('');
        setSaving(true);
        try {
            const res = await uploadMediaFiles(fileList, 'admin');
            const uploaded = Array.isArray(res?.files) ? res.files : [];
            const mediaItems = uploaded
                .map((f) => {
                    const src = typeof f?.url === 'string' ? f.url.trim() : '';
                    const type = f?.type === 'video' ? 'video' : 'image';
                    return src ? { type, src } : null;
                })
                .filter(Boolean);

            setDraft((d) => {
                const colors = [...d.colors];
                const color = colors[index] || { name: '', hex: '#000000', media: [] };
                const media = Array.isArray(color.media) ? [...color.media] : [];

                for (const item of mediaItems) {
                    if (media.some((m) => m?.src === item.src)) continue;
                    media.push(item);
                }

                colors[index] = { ...color, media };
                return { ...d, colors };
            });
        } catch (e) {
            setError(e?.message || 'Upload failed');
        } finally {
            setSaving(false);
        }
    }

    function removeColorMedia(colorIndex, mediaIndex) {
        setDraft((d) => {
            const colors = [...d.colors];
            const color = colors[colorIndex];
            if (!color || !Array.isArray(color.media)) return d;
            const media = color.media.filter((_, idx) => idx !== mediaIndex);
            colors[colorIndex] = { ...color, media };
            return { ...d, colors };
        });
    }

    return (
        <div className="stack">
            {/* Dashboard Header */}
            <div className="dashboardHeader">
                <h1 className="pageTitle">Admin Dashboard</h1>
            </div>

            {/* Stats Cards */}
            <div className="statsGrid">
                <div className="statCard statCard--blue">
                    <div className="statLabel">TOTAL PRODUCTS</div>
                    <div className="statValue">{stats.totalProducts}</div>
                </div>
                <div className="statCard statCard--green">
                    <div className="statLabel">IN STOCK</div>
                    <div className="statValue">{stats.inStock}</div>
                </div>
                <div className="statCard statCard--cyan">
                    <div className="statLabel">CATEGORIES</div>
                    <div className="statValue">{stats.categories}</div>
                </div>
                <div className="statCard statCard--yellow">
                    <div className="statLabel">AVERAGE PRICE</div>
                    <div className="statValue">${Number(stats.avgPrice).toFixed(2)}</div>
                </div>
            </div>

            {/* Category Distribution */}
            {categoryDistribution.length > 0 && (
                <div className="categoryDistribution">
                    <h2 className="sectionTitle">Category Distribution</h2>
                    <div className="categoryGrid">
                        {categoryDistribution.map((cat) => (
                            <div key={cat.name} className="categoryItem">
                                <div className="categoryIcon">📦</div>
                                <div className="categoryName">{cat.name}</div>
                                <div className="categoryCount">{cat.count}</div>
                                <div className="categoryPercent">{cat.percentage}%</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="adminTabs">
                <button
                    className={`adminTab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`adminTab ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    Products
                </button>
                <button
                    className={`adminTab ${activeTab === 'orders' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('orders');
                        refreshOrders();
                    }}
                >
                    Orders
                </button>
                <button
                    className={`adminTab ${activeTab === 'add' ? 'active' : ''}`}
                    onClick={() => {
                        resetForm();
                        setActiveTab('add');
                    }}
                >
                    + Add Product
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="tabContent">
                    <div className="welcomeSection">
                        <h2 className="welcomeTitle">Welcome to Admin Dashboard</h2>
                        <p className="welcomeText">Welcome to the Admin Dashboard! Here you can manage your store.</p>
                    </div>
                </div>
            )}

            {activeTab === 'products' && (
                <div className="tabContent">
                    {loading ? <div className="muted">Loading…</div> : null}
                    {error ? <div className="error">{error}</div> : null}

                    <div className="adminToolbar">
                        <input
                            type="text"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search products…"
                            aria-label="Search products"
                        />
                        <button className="button" type="button" onClick={refresh} disabled={loading || saving}>
                            Search
                        </button>
                        <button className="button" type="button" onClick={refresh} disabled={loading || saving}>
                            Refresh
                        </button>
                    </div>

                    <div className="adminGrid">
                        <div className="adminList">
                            <div className="adminListHeader">Products ({items.length})</div>
                            <div className="adminListItems">
                                {Object.entries(groupedProducts).map(([category, products]) => (
                                    <div key={category}>
                                        <div
                                            style={{
                                                padding: '12px 16px',
                                                backgroundColor: '#f8fafc',
                                                borderBottom: '2px solid #e2e8f0',
                                                fontWeight: 'bold',
                                                fontSize: '14px',
                                                color: '#475569',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                            }}
                                        >
                                            {category} ({products.length})
                                        </div>
                                        {products.map((p) => (
                                            <div key={p._id} className={`adminRow ${editingId === p._id ? 'active' : ''}`}>
                                                <div className="adminRowMain">
                                                    <div className="adminRowTitle">{p.title}</div>
                                                    <div className="muted" style={{ fontSize: 13 }}>
                                                        {p.currency} ${Number(p.price).toFixed(2)} · {p.inStock ? 'In stock' : 'Out of stock'}
                                                    </div>
                                                </div>
                                                <div className="adminRowActions">
                                                    <button className="button" type="button" onClick={() => startEdit(p._id)} disabled={saving}>
                                                        Edit
                                                    </button>
                                                    <button className="button" type="button" onClick={() => onDelete(p._id)} disabled={saving}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="adminEditor authCard">
                            <div className="authTitle" style={{ marginBottom: 6 }}>{isEditing ? 'Edit product' : 'Create product'}</div>
                            <div className="muted" style={{ marginBottom: 16 }}>
                                {isEditing ? 'Updates are saved immediately.' : 'Create a new product.'}
                            </div>

                            <form className="authForm" onSubmit={onSave}>
                                <label className="authField">
                                    <span className="authLabel">Title</span>
                                    <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} required />
                                </label>

                                <label className="authField">
                                    <span className="authLabel">Description</span>
                                    <textarea
                                        className="adminTextarea"
                                        value={draft.description}
                                        onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                        rows={5}
                                        placeholder="Short description"
                                    />
                                </label>

                                <div className="authTwoCol">
                                    <label className="authField">
                                        <span className="authLabel">Sale Price</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={draft.price}
                                            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                                            required
                                        />
                                    </label>

                                    <label className="authField">
                                        <span className="authLabel">Original Price (Compare at)</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={draft.compareAtPrice}
                                            onChange={(e) => setDraft((d) => ({ ...d, compareAtPrice: e.target.value }))}
                                            placeholder="Optional - for showing discounts"
                                        />
                                    </label>
                                </div>

                                {draft.compareAtPrice && Number(draft.compareAtPrice) > Number(draft.price || 0) && (
                                    <div
                                        style={{ padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '6px', marginBottom: '16px' }}
                                    >
                                        <div style={{ fontSize: '13px', color: '#0369a1', marginBottom: '8px', fontWeight: 500 }}>💰 Price Preview:</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                                                {draft.currency} {Number(draft.price || 0).toFixed(2)}
                                            </span>
                                            <span style={{ fontSize: '15px', color: '#64748b', textDecoration: 'line-through' }}>
                                                {draft.currency} {Number(draft.compareAtPrice).toFixed(2)}
                                            </span>
                                            <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', backgroundColor: '#0f172a', color: 'white', borderRadius: '4px' }}>
                                                Sale
                                            </span>
                                            <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                                                {Math.round(((Number(draft.compareAtPrice) - Number(draft.price || 0)) / Number(draft.compareAtPrice)) * 100)}% OFF
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="authTwoCol">
                                    <label className="authField">
                                        <span className="authLabel">Category</span>
                                        <select
                                            value={draft.category}
                                            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white' }}
                                        >
                                            {CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat}>
                                                    {cat}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
                                            Choose one of: {CATEGORIES.join(', ')}
                                        </div>
                                    </label>

                                    <label className="authField">
                                        <span className="authLabel">Currency</span>
                                        <select
                                            value={draft.currency}
                                            onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white' }}
                                        >
                                            {CURRENCIES.map((curr) => (
                                                <option key={curr} value={curr}>
                                                    {curr}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="authField">
                                    <span className="authLabel">Tags</span>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                        {AVAILABLE_TAGS.map((tag) => {
                                            const isSelected = draft.tags
                                                .split(',')
                                                .map((t) => t.trim())
                                                .filter(Boolean)
                                                .includes(tag);
                                            return (
                                                <button
                                                    key={tag}
                                                    type="button"
                                                    onClick={() => {
                                                        const currentTags = draft.tags
                                                            .split(',')
                                                            .map((t) => t.trim())
                                                            .filter(Boolean);
                                                        if (isSelected) {
                                                            setDraft((d) => ({ ...d, tags: currentTags.filter((t) => t !== tag).join(', ') }));
                                                        } else {
                                                            setDraft((d) => ({ ...d, tags: [...currentTags, tag].join(', ') }));
                                                        }
                                                    }}
                                                    disabled={saving}
                                                    style={{
                                                        padding: '6px 12px',
                                                        borderRadius: '20px',
                                                        border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                                                        backgroundColor: isSelected ? '#0f172a' : 'white',
                                                        color: isSelected ? 'white' : '#475569',
                                                        cursor: 'pointer',
                                                        fontSize: '13px',
                                                        fontWeight: isSelected ? '600' : '400',
                                                        transition: 'all 0.2s',
                                                    }}
                                                >
                                                    {isSelected && '✓ '}
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <input
                                        value={draft.tags}
                                        onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                                        placeholder="Or type custom tags (comma separated)"
                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                                    />
                                </div>

                                <div className="authField">
                                    <span className="authLabel">Colors</span>
                                    <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                                        Enter color name and the hex code will be auto-generated. You can also manually adjust the color picker.
                                    </p>

                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto 120px 90px auto',
                                            gap: '8px',
                                            alignItems: 'center',
                                            marginBottom: '16px',
                                        }}
                                    >
                                        <input
                                            type="text"
                                            value={colorInput.name}
                                            onChange={(e) => handleColorNameChange(e.target.value)}
                                            placeholder="e.g., Navy Blue, Cream, Sage"
                                            disabled={saving}
                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                        />
                                        <input
                                            type="color"
                                            value={colorInput.hex}
                                            onChange={(e) => setColorInput({ ...colorInput, hex: e.target.value })}
                                            disabled={saving}
                                            style={{ width: '50px', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                                        />
                                        <input
                                            type="text"
                                            value={colorInput.hex}
                                            onChange={(e) => setColorInput({ ...colorInput, hex: e.target.value })}
                                            disabled={saving}
                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                                            placeholder="#000000"
                                        />
                                        <input
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={Number.isFinite(Number(colorInput.qty)) ? Number(colorInput.qty) : 0}
                                            onChange={(e) => setColorInput((c) => ({ ...c, qty: e.target.value }))}
                                            disabled={saving}
                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                            placeholder="Qty"
                                        />
                                        <button type="button" className="button" onClick={addColor} disabled={saving} style={{ padding: '8px 16px' }}>
                                            Add Color
                                        </button>
                                    </div>

                                    {draft.colors.length > 0 && (
                                        <div style={{ display: 'grid', gap: '8px' }}>
                                            {draft.colors.map((color, idx) => (
                                                <div key={idx} style={{ display: 'grid', gap: '8px' }}>
                                                    <div
                                                        style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: '1fr auto 120px 90px auto',
                                                            gap: '8px',
                                                            alignItems: 'center',
                                                            padding: '8px',
                                                            border: '1px solid #ddd',
                                                            borderRadius: '4px',
                                                            backgroundColor: '#fafafa',
                                                        }}
                                                    >
                                                        <input
                                                            type="text"
                                                            value={color.name}
                                                            onChange={(e) => updateColorName(idx, e.target.value)}
                                                            disabled={saving}
                                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        />
                                                        <input
                                                            type="color"
                                                            value={color.hex || '#000000'}
                                                            onChange={(e) => updateColorHex(idx, e.target.value)}
                                                            disabled={saving}
                                                            style={{ width: '50px', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={color.hex || ''}
                                                            onChange={(e) => updateColorHex(idx, e.target.value)}
                                                            disabled={saving}
                                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                                                            placeholder="#000000"
                                                        />
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            value={Number.isFinite(Number(color.qty)) ? Number(color.qty) : 0}
                                                            onChange={(e) => updateColorQty(idx, e.target.value)}
                                                            disabled={saving}
                                                            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                            placeholder="Qty"
                                                        />
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <label className="button" style={{ padding: '8px 12px', cursor: 'pointer' }}>
                                                                + Media
                                                                <input
                                                                    type="file"
                                                                    accept="image/*,video/*"
                                                                    multiple
                                                                    disabled={saving}
                                                                    onChange={(e) => {
                                                                        addColorMedia(idx, e.target.files);
                                                                        e.target.value = '';
                                                                    }}
                                                                    style={{ display: 'none' }}
                                                                />
                                                            </label>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeColor(idx)}
                                                                disabled={saving}
                                                                className="button"
                                                                style={{ padding: '8px 12px', background: '#ff6b6b', color: 'white', border: 'none' }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {Array.isArray(color.media) && color.media.length > 0 && (
                                                        <div
                                                            style={{
                                                                gridColumn: '1 / -1',
                                                                padding: '8px',
                                                                background: '#fff',
                                                                borderRadius: '4px',
                                                                border: '1px solid #e2e8f0',
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                                                                Media ({color.media.length})
                                                            </div>
                                                            <div
                                                                style={{
                                                                    display: 'grid',
                                                                    gap: '8px',
                                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                                                }}
                                                            >
                                                                {color.media.map((m, mediaIdx) => (
                                                                    <div
                                                                        key={mediaIdx}
                                                                        style={{
                                                                            position: 'relative',
                                                                            border: '1px solid #e2e8f0',
                                                                            borderRadius: '6px',
                                                                            overflow: 'hidden',
                                                                            background: '#f8fafc',
                                                                        }}
                                                                    >
                                                                        {m.type === 'video' ? (
                                                                            <video src={m.src} controls style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                                                                        ) : (
                                                                            <img
                                                                                src={m.src}
                                                                                alt={`${color.name} media ${mediaIdx + 1}`}
                                                                                style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                                                                            />
                                                                        )}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => removeColorMedia(idx, mediaIdx)}
                                                                            disabled={saving}
                                                                            style={{
                                                                                position: 'absolute',
                                                                                top: '6px',
                                                                                right: '6px',
                                                                                background: 'rgba(239,68,68,0.9)',
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                borderRadius: '4px',
                                                                                padding: '4px 6px',
                                                                                cursor: 'pointer',
                                                                            }}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="authActions">
                                    <button className="button buttonPrimary" type="submit" disabled={saving}>
                                        {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create'}
                                    </button>
                                    {isEditing ? (
                                        <button className="button" type="button" onClick={resetForm} disabled={saving}>
                                            Cancel
                                        </button>
                                    ) : null}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="tabContent adminOrders">
                    {ordersLoading ? <div className="muted">Loading…</div> : null}
                    {ordersError ? <div className="error">{ordersError}</div> : null}

                    <div className="adminToolbar">
                        <div className="muted">Customer orders ({orderCounts[orderStatusFilter] ?? orderCounts.all})</div>
                        <button className="button" type="button" onClick={refreshOrders} disabled={ordersLoading || saving}>
                            Refresh
                        </button>
                    </div>

                    <div className="adminOrdersFilters">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'pending', label: 'Pending' },
                            { key: 'shipped', label: 'Shipped' },
                            { key: 'delivered', label: 'Delivered' },
                            { key: 'cancelled', label: 'Cancelled' },
                        ].map((f) => {
                            const active = orderStatusFilter === f.key;
                            const count = orderCounts[f.key] ?? 0;
                            return (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => setOrderStatusFilter(f.key)}
                                    className={`adminPill ${active ? 'active' : ''}`}
                                >
                                    {f.label} ({count})
                                </button>
                            );
                        })}
                    </div>

                    <div className="adminList">
                        <div className="adminListHeader">Orders</div>
                        <div className="adminListItems">
                            {orders.length === 0 && !ordersLoading ? (
                                <div className="muted" style={{ padding: 16 }}>No orders yet.</div>
                            ) : null}

                            {filteredOrders.map((o) => {
                                const customerName = o?.user?.name || '';
                                const customerEmail = o?.user?.email || o?.contact?.email || '';
                                const customerContact = o?.contact?.emailOrPhone || '';
                                const customer = customerEmail || customerContact || 'Unknown';

                                const rawPhone = String(o?.shippingAddress?.phone || o?.billingAddress?.phone || '').trim();
                                const contactLooksLikePhone = customerContact && !String(customerContact).includes('@');
                                const customerPhone = rawPhone || (contactLooksLikePhone ? String(customerContact).trim() : '');

                                const itemCount = Array.isArray(o?.items)
                                    ? o.items.reduce((sum, it) => sum + Number(it?.qty || 0), 0)
                                    : 0;

                                const shippingText = formatAddress(o?.shippingAddress);
                                const billingText = formatAddress(o?.billingAddress);
                                const userMeta = [
                                    customerName ? `Name: ${customerName}` : '',
                                    customerEmail ? `Email: ${customerEmail}` : '',
                                    customerPhone ? `Phone: ${customerPhone}` : '',
                                    customerContact ? `Contact: ${customerContact}` : '',
                                    o?.user?._id ? `User ID: ${o.user._id}` : '',
                                    o?.user?.role ? `Role: ${o.user.role}` : '',
                                ]
                                    .filter(Boolean)
                                    .join('\n');

                                const uiStatus = String(o.__uiStatus || 'pending');
                                const statusForClass = normalizeStatusForUi(uiStatus);

                                return (
                                    <details key={o._id} className="orderCard">
                                        <summary className="orderSummary">
                                            <div className="orderSummaryLeft">
                                                <div className="orderTitleRow">
                                                    <div className="orderId">Order #{String(o._id).slice(-8)}</div>
                                                    <div className="orderBadges">
                                                        <span className={`statusBadge ${statusForClass}`}>{uiStatus}</span>
                                                        <span className="statusBadge" style={{ background: 'rgba(0,0,0,0.06)' }}>
                                                            {String(o.paymentMethod || 'cod')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="orderMetaLine">
                                                    {customer}
                                                    {customerPhone ? ` · ${customerPhone}` : ''} · {formatDate(o.createdAt)} · {itemCount} item(s)
                                                </div>
                                            </div>

                                            <div className="orderSummaryRight">
                                                <div className="orderTotal">{formatMoney(o.currency, o.total)}</div>
                                                <div className="orderSmallMeta">Subtotal {formatMoney(o.currency, o.subtotal)}</div>
                                            </div>
                                        </summary>

                                        <div className="orderPanel">
                                            <div className="orderTotalsRow">
                                                Shipping: {formatMoney(o.currency, o.shipping)} · Discount: {formatMoney(o.currency, o.discount)}
                                            </div>

                                            <div className="orderActionsRow">
                                                <label>Status</label>
                                                <select
                                                    className="orderSelect"
                                                    value={orderStatusDrafts[String(o._id)] ?? String(o.__uiStatus || 'pending')}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setOrderStatusDrafts((prev) => ({ ...(prev || {}), [String(o._id)]: v }));
                                                    }}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>

                                                <button
                                                    type="button"
                                                    className="button"
                                                    disabled={ordersLoading || saving || orderStatusSavingId === String(o._id)}
                                                    onClick={() => updateOrderStatus(String(o._id), orderStatusDrafts[String(o._id)] ?? String(o.__uiStatus || 'pending'))}
                                                >
                                                    {orderStatusSavingId === String(o._id) ? 'Updating…' : 'Update status'}
                                                </button>
                                            </div>

                                            <div className="orderInfoGrid">
                                                <div className="orderInfoCard">
                                                    <div className="orderInfoTitle">Customer</div>
                                                    <div className="orderPre">{userMeta || customer}</div>
                                                </div>

                                                <div className="orderInfoCard">
                                                    <div className="orderInfoTitle">Shipping address</div>
                                                    <div className="orderPre">{shippingText || '—'}</div>
                                                </div>

                                                <div className="orderInfoCard">
                                                    <div className="orderInfoTitle">Billing address</div>
                                                    <div className="orderPre">{billingText || '—'}</div>
                                                </div>
                                            </div>

                                            {Array.isArray(o.items) && o.items.length ? (
                                                <div className="orderItems">
                                                    {o.items.map((it) => (
                                                        <div key={it.key} className="orderItemRow">
                                                            <div>
                                                                <div className="orderItemTitle">{it.title}</div>
                                                                <div className="orderItemMeta">
                                                                    {it.colorName ? `${it.colorName} · ` : ''}Qty: {it.qty}
                                                                </div>
                                                            </div>
                                                            <div className="orderItemTitle">{formatMoney(it.currency || o.currency, Number(it.price || 0) * Number(it.qty || 0))}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </details>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'add' && (
                <div className="tabContent">
                    {error ? <div className="error">{error}</div> : null}
                    <div className="adminEditor authCard" style={{ maxWidth: '600px' }}>
                        <div className="authTitle" style={{ marginBottom: 6 }}>Create New Product</div>
                        <div className="muted" style={{ marginBottom: 16 }}>
                            Add a new product to your store.
                        </div>

                        <form className="authForm" onSubmit={onSave}>
                            <label className="authField">
                                <span className="authLabel">Title</span>
                                <input value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} required />
                            </label>

                            <label className="authField">
                                <span className="authLabel">Description</span>
                                <textarea
                                    className="adminTextarea"
                                    value={draft.description}
                                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                                    rows={5}
                                    placeholder="Short description"
                                />
                            </label>

                            <div className="authTwoCol">
                                <label className="authField">
                                    <span className="authLabel">Sale Price</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={draft.price}
                                        onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                                        required
                                    />
                                </label>

                                <label className="authField">
                                    <span className="authLabel">Original Price (Compare at)</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={draft.compareAtPrice}
                                        onChange={(e) => setDraft((d) => ({ ...d, compareAtPrice: e.target.value }))}
                                        placeholder="Optional - for showing discounts"
                                    />
                                </label>
                            </div>

                            {draft.compareAtPrice && Number(draft.compareAtPrice) > Number(draft.price || 0) && (
                                <div
                                    style={{ padding: '12px', backgroundColor: '#f0f9ff', border: '1px solid #0284c7', borderRadius: '6px', marginBottom: '16px' }}
                                >
                                    <div style={{ fontSize: '13px', color: '#0369a1', marginBottom: '8px', fontWeight: 500 }}>💰 Price Preview:</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a' }}>
                                            {draft.currency} {Number(draft.price || 0).toFixed(2)}
                                        </span>
                                        <span style={{ fontSize: '15px', color: '#64748b', textDecoration: 'line-through' }}>
                                            {draft.currency} {Number(draft.compareAtPrice).toFixed(2)}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', backgroundColor: '#0f172a', color: 'white', borderRadius: '4px' }}>
                                            Sale
                                        </span>
                                        <span style={{ fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                                            {Math.round(((Number(draft.compareAtPrice) - Number(draft.price || 0)) / Number(draft.compareAtPrice)) * 100)}% OFF
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="authTwoCol">
                                <label className="authField">
                                    <span className="authLabel">Category</span>
                                    <select
                                        value={draft.category}
                                        onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white' }}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="authField">
                                    <span className="authLabel">Currency</span>
                                    <select
                                        value={draft.currency}
                                        onChange={(e) => setDraft((d) => ({ ...d, currency: e.target.value }))}
                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', backgroundColor: 'white' }}
                                    >
                                        {CURRENCIES.map((curr) => (
                                            <option key={curr} value={curr}>
                                                {curr}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="authField">
                                <span className="authLabel">Tags</span>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                                    {AVAILABLE_TAGS.map((tag) => {
                                        const isSelected = draft.tags
                                            .split(',')
                                            .map((t) => t.trim())
                                            .filter(Boolean)
                                            .includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                    const currentTags = draft.tags
                                                        .split(',')
                                                        .map((t) => t.trim())
                                                        .filter(Boolean);
                                                    if (isSelected) {
                                                        setDraft((d) => ({ ...d, tags: currentTags.filter((t) => t !== tag).join(', ') }));
                                                    } else {
                                                        setDraft((d) => ({ ...d, tags: [...currentTags, tag].join(', ') }));
                                                    }
                                                }}
                                                disabled={saving}
                                                style={{
                                                    padding: '6px 12px',
                                                    borderRadius: '20px',
                                                    border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                                                    backgroundColor: isSelected ? '#0f172a' : 'white',
                                                    color: isSelected ? 'white' : '#475569',
                                                    cursor: 'pointer',
                                                    fontSize: '13px',
                                                    fontWeight: isSelected ? '600' : '400',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {isSelected && '✓ '}
                                                {tag}
                                            </button>
                                        );
                                    })}
                                </div>
                                <input
                                    value={draft.tags}
                                    onChange={(e) => setDraft((d) => ({ ...d, tags: e.target.value }))}
                                    placeholder="Or type custom tags (comma separated)"
                                    style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontSize: '13px' }}
                                />
                            </div>

                            <div className="authField">
                                <span className="authLabel">Colors</span>
                                <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                                    Enter color name and the hex code will be auto-generated. You can also manually adjust the color picker.
                                </p>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr auto 120px 90px auto',
                                        gap: '8px',
                                        alignItems: 'center',
                                        marginBottom: '16px',
                                    }}
                                >
                                    <input
                                        type="text"
                                        value={colorInput.name}
                                        onChange={(e) => handleColorNameChange(e.target.value)}
                                        placeholder="e.g., Navy Blue, Cream, Sage"
                                        disabled={saving}
                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                    />
                                    <input
                                        type="color"
                                        value={colorInput.hex}
                                        onChange={(e) => setColorInput({ ...colorInput, hex: e.target.value })}
                                        disabled={saving}
                                        style={{ width: '50px', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                                    />
                                    <input
                                        type="text"
                                        value={colorInput.hex}
                                        onChange={(e) => setColorInput({ ...colorInput, hex: e.target.value })}
                                        disabled={saving}
                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                                        placeholder="#000000"
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        value={Number.isFinite(Number(colorInput.qty)) ? Number(colorInput.qty) : 0}
                                        onChange={(e) => setColorInput((c) => ({ ...c, qty: e.target.value }))}
                                        disabled={saving}
                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                        placeholder="Qty"
                                    />
                                    <button type="button" className="button" onClick={addColor} disabled={saving} style={{ padding: '8px 16px' }}>
                                        Add Color
                                    </button>
                                </div>

                                {draft.colors.length > 0 && (
                                    <div style={{ display: 'grid', gap: '8px' }}>
                                        {draft.colors.map((color, idx) => (
                                            <div key={idx} style={{ display: 'grid', gap: '8px' }}>
                                                <div
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '1fr auto 120px 90px auto',
                                                        gap: '8px',
                                                        alignItems: 'center',
                                                        padding: '8px',
                                                        border: '1px solid #ddd',
                                                        borderRadius: '4px',
                                                        backgroundColor: '#fafafa',
                                                    }}
                                                >
                                                    <input
                                                        type="text"
                                                        value={color.name}
                                                        onChange={(e) => updateColorName(idx, e.target.value)}
                                                        disabled={saving}
                                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                    />
                                                    <input
                                                        type="color"
                                                        value={color.hex || '#000000'}
                                                        onChange={(e) => updateColorHex(idx, e.target.value)}
                                                        disabled={saving}
                                                        style={{ width: '50px', height: '40px', cursor: 'pointer', border: 'none', borderRadius: '4px' }}
                                                    />
                                                    <input
                                                        type="text"
                                                        value={color.hex || ''}
                                                        onChange={(e) => updateColorHex(idx, e.target.value)}
                                                        disabled={saving}
                                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd', fontFamily: 'monospace' }}
                                                        placeholder="#000000"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        value={Number.isFinite(Number(color.qty)) ? Number(color.qty) : 0}
                                                        onChange={(e) => updateColorQty(idx, e.target.value)}
                                                        disabled={saving}
                                                        style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                                                        placeholder="Qty"
                                                    />
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <label className="button" style={{ padding: '8px 12px', cursor: 'pointer' }}>
                                                            + Media
                                                            <input
                                                                type="file"
                                                                accept="image/*,video/*"
                                                                multiple
                                                                disabled={saving}
                                                                onChange={(e) => {
                                                                    addColorMedia(idx, e.target.files);
                                                                    e.target.value = '';
                                                                }}
                                                                style={{ display: 'none' }}
                                                            />
                                                        </label>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeColor(idx)}
                                                            disabled={saving}
                                                            className="button"
                                                            style={{ padding: '8px 12px', background: '#ff6b6b', color: 'white', border: 'none' }}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>

                                                {Array.isArray(color.media) && color.media.length > 0 && (
                                                    <div
                                                        style={{
                                                            gridColumn: '1 / -1',
                                                            padding: '8px',
                                                            background: '#fff',
                                                            borderRadius: '4px',
                                                            border: '1px solid #e2e8f0',
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '12px', color: '#475569', marginBottom: '6px' }}>
                                                            Media ({color.media.length})
                                                        </div>
                                                        <div
                                                            style={{
                                                                display: 'grid',
                                                                gap: '8px',
                                                                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                                            }}
                                                        >
                                                            {color.media.map((m, mediaIdx) => (
                                                                <div
                                                                    key={mediaIdx}
                                                                    style={{
                                                                        position: 'relative',
                                                                        border: '1px solid #e2e8f0',
                                                                        borderRadius: '6px',
                                                                        overflow: 'hidden',
                                                                        background: '#f8fafc',
                                                                    }}
                                                                >
                                                                    {m.type === 'video' ? (
                                                                        <video src={m.src} controls style={{ width: '100%', height: '120px', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <img
                                                                            src={m.src}
                                                                            alt={`${color.name} media ${mediaIdx + 1}`}
                                                                            style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                                                                        />
                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeColorMedia(idx, mediaIdx)}
                                                                        disabled={saving}
                                                                        style={{
                                                                            position: 'absolute',
                                                                            top: '6px',
                                                                            right: '6px',
                                                                            background: 'rgba(239,68,68,0.9)',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            padding: '4px 6px',
                                                                            cursor: 'pointer',
                                                                        }}
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="authActions">
                                <button className="button buttonPrimary" type="submit" disabled={saving}>
                                    {saving ? 'Creating…' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

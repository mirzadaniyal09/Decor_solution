import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import RemoteImage from '../components/RemoteImage.jsx';

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

function clampQty(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.max(1, Math.min(99, Math.floor(n)));
}

function formatMoney(n) {
    const v = Number(n || 0);
    if (!Number.isFinite(v)) return '$0.00';
    return `$${v.toFixed(2)}`;
}

export default function CartPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState(() => readCart());

    useEffect(() => {
        const onChange = () => setItems(readCart());
        window.addEventListener('storage', onChange);
        window.addEventListener('cart:changed', onChange);
        return () => {
            window.removeEventListener('storage', onChange);
            window.removeEventListener('cart:changed', onChange);
        };
    }, []);

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, it) => sum + Number(it?.price || 0) * Number(it?.qty || 0), 0);
        const qty = items.reduce((sum, it) => sum + Number(it?.qty || 0), 0);
        return { subtotal, qty };
    }, [items]);

    function updateQty(key, nextQty) {
        const q = clampQty(nextQty);
        const next = items.map((it) => (it?.key === key ? { ...it, qty: q } : it));
        setItems(next);
        writeCart(next);
    }

    function removeItem(key) {
        const next = items.filter((it) => it?.key !== key);
        setItems(next);
        writeCart(next);
    }

    function clearCart() {
        setItems([]);
        writeCart([]);
    }

    return (
        <div className="cartPage">
            <div className="row between">
                <div className="stack" style={{ gap: '6px' }}>
                    <h1 style={{ margin: 0 }}>Cart</h1>
                    <div className="muted">{totals.qty ? `${totals.qty} items` : 'Your cart is empty'}</div>
                </div>
                <div className="row" style={{ gap: '10px' }}>
                    <Link className="button" to="/shop">Continue shopping</Link>
                    {items.length ? (
                        <button className="button" type="button" onClick={clearCart}>Clear</button>
                    ) : null}
                </div>
            </div>

            {items.length === 0 ? (
                <div className="cartEmpty">
                    <div className="cartEmptyCard">
                        <div className="cartEmptyTitle">Nothing here yet</div>
                        <div className="muted">Browse products and add your favorites.</div>
                        <div className="row" style={{ marginTop: '10px' }}>
                            <Link className="button buttonPrimary" to="/shop">Go to shop</Link>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="cartLayout">
                    <div className="cartItems">
                        {items.map((it) => (
                            <div key={it.key} className="cartItem">
                                <Link to={`/product/${it.slug}`} className="cartThumb" aria-label={`View ${it.title}`}>
                                    <RemoteImage src={it.image} alt={it.title} className="cartThumbImg" loading="lazy" />
                                </Link>

                                <div className="cartInfo">
                                    <div className="cartTitleRow">
                                        <Link to={`/product/${it.slug}`} className="cartTitle">{it.title}</Link>
                                        <div className="cartPrice">{formatMoney(it.price)}</div>
                                    </div>

                                    {(it.colorName || it.colorHex) ? (
                                        <div className="cartVariant muted">
                                            <span
                                                className="swatchDotSmall"
                                                style={it.colorHex ? { backgroundColor: it.colorHex } : undefined}
                                                aria-hidden="true"
                                            />
                                            <span>{it.colorName || it.colorHex}</span>
                                        </div>
                                    ) : null}

                                    <div className="cartActions">
                                        <div className="qtyControl" role="group" aria-label="Quantity selector">
                                            <button type="button" className="qtyBtn" onClick={() => updateQty(it.key, Number(it.qty || 1) - 1)} aria-label="Decrease quantity">−</button>
                                            <div className="qtyValue" aria-label={`Quantity ${clampQty(it.qty)}`}>{clampQty(it.qty)}</div>
                                            <button type="button" className="qtyBtn" onClick={() => updateQty(it.key, Number(it.qty || 1) + 1)} aria-label="Increase quantity">+</button>
                                        </div>

                                        <button type="button" className="cartRemove" onClick={() => removeItem(it.key)}>Remove</button>
                                    </div>

                                    <div className="cartLineTotal muted">
                                        Line total: <strong>{formatMoney(Number(it.price || 0) * Number(it.qty || 0))}</strong>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <aside className="cartSummary" aria-label="Order summary">
                        <div className="cartSummaryCard">
                            <div className="cartSummaryTitle">Order Summary</div>
                            <div className="cartSummaryRow">
                                <span className="muted">Subtotal</span>
                                <strong>{formatMoney(totals.subtotal)}</strong>
                            </div>
                            <div className="cartSummaryRow">
                                <span className="muted">Shipping</span>
                                <span className="muted">Calculated at checkout</span>
                            </div>
                            <div className="cartSummaryDivider" />
                            <div className="cartSummaryRow">
                                <span>Total</span>
                                <strong>{formatMoney(totals.subtotal)}</strong>
                            </div>

                            <button
                                type="button"
                                className="purchaseBtn purchaseBtnPrimary"
                                onClick={() => navigate('/checkout')}
                            >
                                Checkout
                            </button>

                            <div className="muted" style={{ fontSize: '12px' }}>
                                Payments and checkout can be wired next.
                            </div>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}

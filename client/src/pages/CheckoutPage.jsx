import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api.js';
import RemoteImage from '../components/RemoteImage.jsx';
import ublBankImage from '../assets/ubl-bank.svg';

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

function readCheckoutDraft() {
    try {
        const raw = localStorage.getItem('checkout:draft');
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

function writeCheckoutDraft(draft) {
    try {
        localStorage.setItem('checkout:draft', JSON.stringify(draft));
    } catch {
        // ignore
    }
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

export default function CheckoutPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [items, setItems] = useState(() => readCart());
    const [productImagesBySlug, setProductImagesBySlug] = useState(() => new Map());

    function removeFromCheckoutSession(itemKey) {
        const key = String(itemKey || '');
        if (!key) return;
        const next = readCart().filter((it) => String(it?.key || '') !== key);
        writeCart(next);
        setItems(next);
    }

    const searchParams = new URLSearchParams(location.search);
    const paymentParam = String(searchParams.get('payment') || '').toLowerCase();
    const initialPayment = paymentParam === 'bank' ? 'bank' : 'cod';

    const currency = useMemo(() => {
        const first = items.find((it) => it?.currency)?.currency;
        return first || 'USD';
    }, [items]);

    useEffect(() => {
        const onChange = () => setItems(readCart());
        window.addEventListener('storage', onChange);
        window.addEventListener('cart:changed', onChange);
        return () => {
            window.removeEventListener('storage', onChange);
            window.removeEventListener('cart:changed', onChange);
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        const slugs = Array.from(
            new Set(
                items
                    .map((it) => String(it?.slug || '').trim())
                    .filter(Boolean)
            )
        );
        if (!slugs.length) return;

        (async () => {
            const results = await Promise.all(
                slugs.map(async (slug) => {
                    try {
                        const data = await apiGet(`/api/products/${encodeURIComponent(slug)}`);
                        const product = data?.product;
                        const imgFromImages = Array.isArray(product?.images) ? product.images.find(Boolean) : '';
                        const imgFromColors = Array.isArray(product?.colors)
                            ? product.colors
                                .flatMap((c) => (Array.isArray(c?.media) ? c.media : []))
                                .find((m) => m?.type === 'image' && m?.src)?.src
                            : '';
                        const img = String(imgFromImages || imgFromColors || '');
                        return [slug, String(img || '')];
                    } catch {
                        return [slug, ''];
                    }
                })
            );

            if (cancelled) return;
            setProductImagesBySlug((prev) => {
                const next = new Map(prev);
                for (const [slug, img] of results) {
                    if (img) next.set(slug, img);
                }
                return next;
            });
        })();

        return () => {
            cancelled = true;
        };
    }, [items]);

    const qty = useMemo(() => items.reduce((sum, it) => sum + Number(it?.qty || 0), 0), [items]);
    const subtotal = useMemo(
        () => items.reduce((sum, it) => sum + Number(it?.price || 0) * Number(it?.qty || 0), 0),
        [items]
    );

    const [contact, setContact] = useState('');
    const [emailOpt, setEmailOpt] = useState('');
    const [country, setCountry] = useState('Pakistan');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [address1, setAddress1] = useState('');
    const [address2, setAddress2] = useState('');
    const [city, setCity] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [phone, setPhone] = useState('');

    const [billCountry, setBillCountry] = useState('Pakistan');
    const [billFirstName, setBillFirstName] = useState('');
    const [billLastName, setBillLastName] = useState('');
    const [billAddress1, setBillAddress1] = useState('');
    const [billAddress2, setBillAddress2] = useState('');
    const [billCity, setBillCity] = useState('');
    const [billPostalCode, setBillPostalCode] = useState('');
    const [billPhone, setBillPhone] = useState('');

    const [shippingMethod, setShippingMethod] = useState('standard');
    const [paymentMethod, setPaymentMethod] = useState(initialPayment);
    const [billingSame, setBillingSame] = useState(true);

    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState('');
    const [successOrder, setSuccessOrder] = useState(null);

    // draft persistence (makes the flow feel like a session)
    useEffect(() => {
        const draft = readCheckoutDraft();
        if (!draft) return;
        if (draft.contact) setContact(String(draft.contact));
        if (draft.emailOpt) setEmailOpt(String(draft.emailOpt));
        if (draft.country) setCountry(String(draft.country));
        if (draft.firstName) setFirstName(String(draft.firstName));
        if (draft.lastName) setLastName(String(draft.lastName));
        if (draft.address1) setAddress1(String(draft.address1));
        if (draft.address2) setAddress2(String(draft.address2));
        if (draft.city) setCity(String(draft.city));
        if (draft.postalCode) setPostalCode(String(draft.postalCode));
        if (draft.phone) setPhone(String(draft.phone));

        if (draft.billCountry) setBillCountry(String(draft.billCountry));
        if (draft.billFirstName) setBillFirstName(String(draft.billFirstName));
        if (draft.billLastName) setBillLastName(String(draft.billLastName));
        if (draft.billAddress1) setBillAddress1(String(draft.billAddress1));
        if (draft.billAddress2) setBillAddress2(String(draft.billAddress2));
        if (draft.billCity) setBillCity(String(draft.billCity));
        if (draft.billPostalCode) setBillPostalCode(String(draft.billPostalCode));
        if (draft.billPhone) setBillPhone(String(draft.billPhone));
        if (draft.shippingMethod) setShippingMethod(String(draft.shippingMethod));
        if (draft.paymentMethod) setPaymentMethod(String(draft.paymentMethod));
        if (typeof draft.billingSame === 'boolean') setBillingSame(draft.billingSame);
    }, []);

    useEffect(() => {
        writeCheckoutDraft({
            contact,
            emailOpt,
            country,
            firstName,
            lastName,
            address1,
            address2,
            city,
            postalCode,
            phone,
            billCountry,
            billFirstName,
            billLastName,
            billAddress1,
            billAddress2,
            billCity,
            billPostalCode,
            billPhone,
            shippingMethod,
            paymentMethod,
            billingSame,
        });
    }, [
        contact,
        emailOpt,
        country,
        firstName,
        lastName,
        address1,
        address2,
        city,
        postalCode,
        phone,
        billCountry,
        billFirstName,
        billLastName,
        billAddress1,
        billAddress2,
        billCity,
        billPostalCode,
        billPhone,
        shippingMethod,
        paymentMethod,
        billingSame,
    ]);

    const shippingCost = useMemo(() => {
        // Keep it sane for the seeded USD catalog.
        // If you switch catalog currency to PKR later, this can become 350.
        if (String(currency).toUpperCase() === 'PKR') return 350;
        return 0;
    }, [currency]);

    const discount = useMemo(() => {
        if (String(currency).toUpperCase() === 'PKR' && paymentMethod === 'bank') return 360;
        return 0;
    }, [currency, paymentMethod]);

    const total = Math.max(0, subtotal + shippingCost - discount);

    async function placeOrder(e) {
        e.preventDefault();
        setError('');
        setSuccessOrder(null);

        if (!items.length) {
            setError('Your cart is empty.');
            return;
        }
        if (!contact.trim()) {
            setError('Please enter an email or phone number.');
            return;
        }
        if (!firstName.trim() || !lastName.trim()) {
            setError('Please enter your first and last name.');
            return;
        }
        if (!address1.trim() || !city.trim() || !phone.trim() || !country.trim()) {
            setError('Please complete the delivery address and phone.');
            return;
        }

        if (!billingSame) {
            if (!billCountry.trim() || !billFirstName.trim() || !billLastName.trim() || !billAddress1.trim() || !billCity.trim()) {
                setError('Please complete the billing address.');
                return;
            }
        }

        setPlacing(true);
        try {
            const address = {
                country: country.trim(),
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                address1: address1.trim(),
                address2: address2.trim() || undefined,
                city: city.trim(),
                postalCode: postalCode.trim() || undefined,
                phone: phone.trim(),
            };

            const billingAddress = billingSame
                ? address
                : {
                    country: billCountry.trim(),
                    firstName: billFirstName.trim(),
                    lastName: billLastName.trim(),
                    address1: billAddress1.trim(),
                    address2: billAddress2.trim() || undefined,
                    city: billCity.trim(),
                    postalCode: billPostalCode.trim() || undefined,
                    phone: billPhone.trim() || undefined,
                };

            const payload = {
                contact: {
                    emailOrPhone: contact.trim(),
                    email: emailOpt.trim() || undefined,
                },
                shippingAddress: address,
                billingAddress,
                paymentMethod,
                items,
                currency,
                // server recomputes totals; client totals are for display
            };

            const data = await apiPost('/api/orders', payload);
            setSuccessOrder(data?.order || null);

            // Clear cart + draft to simulate a completed session
            writeCart([]);
            setItems([]);
            try {
                localStorage.removeItem('checkout:draft');
            } catch {
                // ignore
            }
        } catch (err) {
            setError(err?.message || 'Failed to place order');
        } finally {
            setPlacing(false);
        }
    }

    return (
        <div className="checkoutPage">
            <div className="checkoutLayout">
                <form className="checkoutLeft" onSubmit={placeOrder}>
                    <div className="checkoutTitleRow">
                        <h1 style={{ margin: 0 }}>Checkout</h1>
                        <button type="button" className="button" onClick={() => navigate('/cart')}>Back to cart</button>
                    </div>

                    {successOrder ? (
                        <div className="checkoutSuccess">
                            <div className="checkoutSuccessTitle">Order created</div>
                            <div className="muted">Order ID: <strong>{String(successOrder.id)}</strong></div>
                            <div className="muted">Status: {successOrder.status}</div>
                            <div className="row" style={{ marginTop: '12px', gap: '10px' }}>
                                <Link className="button buttonPrimary" to="/shop">Continue shopping</Link>
                            </div>
                        </div>
                    ) : null}

                    {items.length === 0 ? (
                        <div className="cartEmpty">
                            <div className="cartEmptyCard">
                                <div className="cartEmptyTitle">Your cart is empty</div>
                                <div className="muted">Add products before checking out.</div>
                                <div className="row" style={{ marginTop: '10px', gap: '10px' }}>
                                    <Link className="button buttonPrimary" to="/shop">Go to shop</Link>
                                    <Link className="button" to="/cart">Back to cart</Link>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <section className="checkoutSection" aria-label="Contact">
                                <div className="checkoutSectionHeader">
                                    <div className="checkoutSectionTitle">Contact</div>
                                    <Link className="checkoutLink" to="/login">Sign in</Link>
                                </div>

                                <label className="checkoutField">
                                    <input
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                        placeholder="Email or mobile phone number"
                                        autoComplete="email"
                                        required
                                    />
                                </label>

                                <label className="checkoutCheckbox">
                                    <input type="checkbox" disabled />
                                    <span>Email me with news and offers</span>
                                </label>

                                <label className="checkoutField">
                                    <input
                                        value={emailOpt}
                                        onChange={(e) => setEmailOpt(e.target.value)}
                                        placeholder="Email (optional, for receipts)"
                                        autoComplete="email"
                                    />
                                </label>
                            </section>

                            <section className="checkoutSection" aria-label="Delivery">
                                <div className="checkoutSectionTitle">Delivery</div>

                                <label className="checkoutField">
                                    <div className="checkoutLabel">Country/Region</div>
                                    <select value={country} onChange={(e) => setCountry(e.target.value)}>
                                        <option value="Pakistan">Pakistan</option>
                                        <option value="United States">United States</option>
                                        <option value="United Kingdom">United Kingdom</option>
                                    </select>
                                </label>

                                <div className="checkoutTwoCol">
                                    <label className="checkoutField">
                                        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" required />
                                    </label>
                                    <label className="checkoutField">
                                        <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" autoComplete="family-name" required />
                                    </label>
                                </div>

                                <label className="checkoutField">
                                    <input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="Address" autoComplete="street-address" required />
                                </label>

                                <label className="checkoutField">
                                    <input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Apartment, suite, etc. (optional)" autoComplete="address-line2" />
                                </label>

                                <div className="checkoutTwoCol">
                                    <label className="checkoutField">
                                        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" autoComplete="address-level2" required />
                                    </label>
                                    <label className="checkoutField">
                                        <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="Postal code (optional)" autoComplete="postal-code" />
                                    </label>
                                </div>

                                <label className="checkoutField">
                                    <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" autoComplete="tel" required />
                                </label>

                                <label className="checkoutCheckbox">
                                    <input type="checkbox" disabled />
                                    <span>Save this information for next time</span>
                                </label>
                            </section>

                            <section className="checkoutSection" aria-label="Shipping method">
                                <div className="checkoutSectionTitle">Shipping method</div>

                                <label className={`checkoutRadioCard ${shippingMethod === 'standard' ? 'active' : ''}`.trim()}>
                                    <input
                                        type="radio"
                                        name="shipping"
                                        value="standard"
                                        checked={shippingMethod === 'standard'}
                                        onChange={() => setShippingMethod('standard')}
                                    />
                                    <div className="checkoutRadioCardBody">
                                        <div>Shipping Price</div>
                                        <div className="checkoutPrice">{shippingCost ? formatMoney(shippingCost, currency) : 'Calculated at checkout'}</div>
                                    </div>
                                </label>
                            </section>

                            <section className="checkoutSection" aria-label="Payment">
                                <div className="checkoutSectionTitle">Payment</div>
                                <div className="muted" style={{ fontSize: '13px' }}>All transactions are secure and encrypted (demo).</div>

                                <label className={`checkoutRadioCard ${paymentMethod === 'cod' ? 'active' : ''}`.trim()}>
                                    <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                                    <div className="checkoutRadioCardBody">
                                        <div>
                                            <div>Cash on Delivery (COD)</div>
                                            <div className="checkoutNote">Delivery available (demo)</div>
                                        </div>
                                    </div>
                                </label>

                                <label className={`checkoutRadioCard ${paymentMethod === 'bank' ? 'active' : ''}`.trim()}>
                                    <input type="radio" name="payment" value="bank" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} />
                                    <div className="checkoutRadioCardBody">
                                        <div>
                                            <div>Bank Deposit</div>
                                            <div className="checkoutNote">Pay via bank transfer and share receipt.</div>
                                        </div>
                                    </div>
                                </label>

                                {paymentMethod === 'bank' ? (
                                    <div className="checkoutInfoBox" role="note" aria-label="Bank deposit instructions">
                                        <img className="checkoutInfoImage" src={ublBankImage} alt="UBL bank" />
                                        <div>Account Title: Amna Amjad</div>
                                        <div>Bank Name: UBL</div>
                                        <div>Account Number: 1192324361692</div>
                                        <div>Send the payment receipt on 0335-0496976</div>
                                        <div className="checkoutInfoDivider" />
                                        <div>IF YOU PAY ONLINE, TAX WILL BE REMOVED</div>
                                    </div>
                                ) : null}
                            </section>

                            <section className="checkoutSection" aria-label="Billing address">
                                <div className="checkoutSectionTitle">Billing address</div>
                                <label className={`checkoutRadioCard ${billingSame ? 'active' : ''}`.trim()}>
                                    <input type="radio" name="billing" value="same" checked={billingSame} onChange={() => setBillingSame(true)} />
                                    <div className="checkoutRadioCardBody">
                                        <div>Same as shipping address</div>
                                    </div>
                                </label>
                                <label className={`checkoutRadioCard ${!billingSame ? 'active' : ''}`.trim()}>
                                    <input type="radio" name="billing" value="different" checked={!billingSame} onChange={() => setBillingSame(false)} />
                                    <div className="checkoutRadioCardBody">
                                        <div>Use a different billing address</div>
                                    </div>
                                </label>

                                {!billingSame ? (
                                    <div className="checkoutBillingForm" aria-label="Billing address form">
                                        <label className="checkoutField">
                                            <div className="checkoutLabel">Country/Region</div>
                                            <select value={billCountry} onChange={(e) => setBillCountry(e.target.value)}>
                                                <option value="Pakistan">Pakistan</option>
                                                <option value="United States">United States</option>
                                                <option value="United Kingdom">United Kingdom</option>
                                            </select>
                                        </label>

                                        <div className="checkoutTwoCol">
                                            <label className="checkoutField">
                                                <input value={billFirstName} onChange={(e) => setBillFirstName(e.target.value)} placeholder="First name" autoComplete="given-name" required />
                                            </label>
                                            <label className="checkoutField">
                                                <input value={billLastName} onChange={(e) => setBillLastName(e.target.value)} placeholder="Last name" autoComplete="family-name" required />
                                            </label>
                                        </div>

                                        <label className="checkoutField">
                                            <input value={billAddress1} onChange={(e) => setBillAddress1(e.target.value)} placeholder="Address" autoComplete="street-address" required />
                                        </label>

                                        <label className="checkoutField">
                                            <input value={billAddress2} onChange={(e) => setBillAddress2(e.target.value)} placeholder="Apartment, suite, etc. (optional)" autoComplete="address-line2" />
                                        </label>

                                        <div className="checkoutTwoCol">
                                            <label className="checkoutField">
                                                <input value={billCity} onChange={(e) => setBillCity(e.target.value)} placeholder="City" autoComplete="address-level2" required />
                                            </label>
                                            <label className="checkoutField">
                                                <input value={billPostalCode} onChange={(e) => setBillPostalCode(e.target.value)} placeholder="Postal code (optional)" autoComplete="postal-code" />
                                            </label>
                                        </div>

                                        <label className="checkoutField">
                                            <input value={billPhone} onChange={(e) => setBillPhone(e.target.value)} placeholder="Phone (optional)" autoComplete="tel" />
                                        </label>
                                    </div>
                                ) : null}
                            </section>

                            {error ? <div className="error">{error}</div> : null}

                            <button className="checkoutPrimary" type="submit" disabled={placing || !!successOrder}>
                                {placing ? 'Creating order…' : 'Complete order'}
                            </button>
                        </>
                    )}
                </form>

                <aside className="checkoutRight" aria-label="Order summary">
                    <div className="checkoutSummaryCard">
                        <div className="checkoutSummaryItems">
                            {items.map((it) => (
                                <div key={it.key} className="checkoutMiniItem">
                                    <div className="checkoutMiniThumb">
                                        <RemoteImage
                                            src={it.image || productImagesBySlug.get(String(it?.slug || '').trim()) || ''}
                                            alt={it.title}
                                            className="checkoutMiniThumbImg"
                                            loading="lazy"
                                        />
                                        <div className="checkoutMiniQty">{Number(it.qty || 0)}</div>
                                    </div>
                                    <div className="checkoutMiniInfo">
                                        <div className="checkoutMiniTitle">{it.title}</div>
                                        {it.colorName ? <div className="muted" style={{ fontSize: '12px' }}>{it.colorName}</div> : null}
                                    </div>
                                    <div className="checkoutMiniActions">
                                        <div className="checkoutMiniPrice">{formatMoney(Number(it.price || 0) * Number(it.qty || 0), currency)}</div>
                                        <button
                                            type="button"
                                            className="checkoutMiniRemove"
                                            onClick={() => removeFromCheckoutSession(it.key)}
                                            aria-label={`Remove ${it.title} from checkout`}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="checkoutSummaryRow">
                            <span className="muted">Subtotal</span>
                            <span>{formatMoney(subtotal, currency)}</span>
                        </div>
                        <div className="checkoutSummaryRow">
                            <span className="muted">Shipping</span>
                            <span>{shippingCost ? formatMoney(shippingCost, currency) : 'Calculated at checkout'}</span>
                        </div>
                        {discount ? (
                            <div className="checkoutSummaryRow">
                                <span className="muted">Discount</span>
                                <span>-{formatMoney(discount, currency)}</span>
                            </div>
                        ) : null}

                        <div className="checkoutSummaryDivider" />
                        <div className="checkoutSummaryRow total">
                            <span>Total</span>
                            <strong>{formatMoney(total, currency)}</strong>
                        </div>

                        <div className="muted" style={{ fontSize: '12px' }}>
                            Items: {qty}
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

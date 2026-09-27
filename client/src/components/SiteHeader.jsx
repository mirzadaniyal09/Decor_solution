import { Link, NavLink, useNavigate } from 'react-router-dom';
import { IconCart, IconSearch, IconUser } from './Icons.jsx';
import { clearAuth, getStoredUser, isLoggedIn } from '../lib/auth.js';
import { useEffect, useMemo, useRef, useState } from 'react';

const baseNavItems = [
    { label: 'Home', to: '/' },
    { label: 'New Arrivals', to: '/shop?category=New%20Arrivals' },
    { label: 'Offers', to: '/shop?category=Offers' },
    { label: 'Limited Edition', to: '/shop?category=Limited%20Edition' },
    { label: 'Top Sellers', to: '/shop?category=Top%20Sellers' },
    { label: 'All Products', to: '/shop' },
    { label: 'Contact Us', to: '/contact' },
];

export default function SiteHeader() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);
    const [cartCount, setCartCount] = useState(0);

    const loggedIn = isLoggedIn();
    const user = useMemo(() => getStoredUser(), [loggedIn]);
    const isAdmin = Boolean(user?.role === 'admin');

    const navItems = useMemo(() => {
        if (loggedIn && isAdmin) return [{ label: 'Admin', to: '/admin/products' }, ...baseNavItems];
        return baseNavItems;
    }, [loggedIn, isAdmin]);

    useEffect(() => {
        function onDocClick(e) {
            if (!menuRef.current) return;
            if (!menuRef.current.contains(e.target)) setOpen(false);
        }
        if (open) document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    useEffect(() => {
        function readCount() {
            try {
                const raw = localStorage.getItem('cart');
                const parsed = raw ? JSON.parse(raw) : [];
                const items = Array.isArray(parsed) ? parsed : [];
                const count = items.reduce((sum, it) => sum + Number(it?.qty || 0), 0);
                setCartCount(Number.isFinite(count) ? count : 0);
            } catch {
                setCartCount(0);
            }
        }

        readCount();
        window.addEventListener('storage', readCount);
        window.addEventListener('cart:changed', readCount);
        return () => {
            window.removeEventListener('storage', readCount);
            window.removeEventListener('cart:changed', readCount);
        };
    }, []);

    return (
        <header className="siteHeader">
            <div className="announcement">
                <div className="container announcementInner">
                    <div className="announcementText">
                        No delivery charges for advance payment.
                    </div>
                </div>
            </div>

            <div className="topbar">
                <div className="container topbarInner">
                    <button
                        className="iconButton"
                        type="button"
                        aria-label="Search"
                        onClick={() => navigate('/shop')}
                    >
                        <IconSearch />
                    </button>

                    <Link to="/" className="logo" aria-label="Alif Store Home">
                        <span className="logoMark">Alif</span>
                        <span className="logoMark">Store</span>
                    </Link>

                    <div className="topbarRight">
                        <div className="accountMenu" ref={menuRef}>
                            <button
                                className="accountChip"
                                type="button"
                                aria-label="Account menu"
                                onClick={() => setOpen((v) => !v)}
                            >
                                <span className="accountChipIcon"><IconUser /></span>
                                <span className="accountChipText">{loggedIn ? (user?.name || 'Account') : 'Login'}</span>
                            </button>

                            {open ? (
                                <div className="accountDropdown" role="menu" aria-label="Account dropdown">
                                    {loggedIn ? (
                                        <>
                                            <button className="accountItem" type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/account'); }}>
                                                My account
                                            </button>
                                            {isAdmin ? (
                                                <button className="accountItem" type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/admin/products'); }}>
                                                    Admin · Products
                                                </button>
                                            ) : null}
                                            <button
                                                className="accountItem danger"
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    clearAuth();
                                                    setOpen(false);
                                                    navigate('/', { replace: true });
                                                }}
                                            >
                                                Log out
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="accountItem" type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/login'); }}>
                                                Login
                                            </button>
                                            <button className="accountItem" type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/signup'); }}>
                                                Sign up
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : null}
                        </div>
                        <button className="iconButton" type="button" aria-label="Cart" onClick={() => navigate('/cart')}>
                            <span className="cartIconWrap" aria-hidden="true">
                                <IconCart />
                                {cartCount > 0 ? <span className="cartBadge">{cartCount > 99 ? '99+' : cartCount}</span> : null}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <nav className="navBar">
                <div className="container navInner">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.to}
                            className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')}
                            end={item.to === '/'}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </header>
    );
}

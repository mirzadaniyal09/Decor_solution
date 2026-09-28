import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api.js';
import { setAuth } from '../lib/auth.js';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const redirectTo = useMemo(() => {
        const from = location.state?.from;
        return typeof from === 'string' && from.startsWith('/') ? from : '/';
    }, [location.state]);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const data = await apiPost('/api/auth/login', { email, password });
            setAuth({ token: data?.token, user: data?.user });
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="authShell">
            <div className="authLayout">
                <section className="authHero" aria-label="Welcome">
                    <div className="authHeroInner">
                        <div className="authKicker">Decor Solution</div>
                        <h1 className="authHeroTitle">Welcome back</h1>
                        <p className="authHeroText">
                            Sign in to track orders, save favorites, and get faster checkout.
                        </p>
                        <div className="authHeroBadges">
                            <div className="authBadge">Secure login</div>
                            <div className="authBadge">Fast checkout</div>
                            <div className="authBadge">Exclusive offers</div>
                        </div>
                    </div>
                </section>

                <section className="authCard" aria-label="Login form">
                    <div className="authCardHeader">
                        <div>
                            <div className="authTitle">Sign in</div>
                            <div className="authSubtitle muted">Use your email and password.</div>
                        </div>
                        <div className="authTabs" role="tablist" aria-label="Auth tabs">
                            <Link className="authTab active" to="/login" role="tab" aria-selected="true">
                                Login
                            </Link>
                            <Link className="authTab" to="/signup" role="tab" aria-selected="false">
                                Sign up
                            </Link>
                        </div>
                    </div>

                    <form className="authForm" onSubmit={onSubmit}>
                        <label className="authField">
                            <span className="authLabel">Email</span>
                            <input
                                type="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                            />
                        </label>

                        <label className="authField">
                            <span className="authLabel">Password</span>
                            <input
                                type="password"
                                name="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                            />
                        </label>

                        <div className="authInlineRow">
                            <span className="muted" style={{ fontSize: 13 }}>Trouble signing in?</span>
                            <Link className="authLink" to="/forgot-password">Forgot password</Link>
                        </div>

                        {error ? <div className="error">{error}</div> : null}

                        <div className="authActions">
                            <button className="button buttonPrimary" type="submit" disabled={loading}>
                                {loading ? 'Signing in…' : 'Sign in'}
                            </button>
                            <Link className="authLink" to="/signup">
                                New here? Create an account
                            </Link>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}

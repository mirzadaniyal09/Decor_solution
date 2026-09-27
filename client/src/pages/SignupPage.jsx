import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api.js';
import { setAuth } from '../lib/auth.js';

export default function SignupPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const redirectTo = useMemo(() => {
        const from = location.state?.from;
        return typeof from === 'string' && from.startsWith('/') ? from : '/';
    }, [location.state]);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function onSubmit(e) {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const data = await apiPost('/api/auth/register', { name, email, password });
            setAuth({ token: data?.token, user: data?.user });
            navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(err?.message || 'Sign up failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="authShell">
            <div className="authLayout">
                <section className="authHero" aria-label="Create account">
                    <div className="authHeroInner">
                        <div className="authKicker">Alif Store</div>
                        <h1 className="authHeroTitle">Create your account</h1>
                        <p className="authHeroText">
                            Join to save favorites and get early access to new arrivals.
                        </p>
                        <div className="authHeroBadges">
                            <div className="authBadge">Member deals</div>
                            <div className="authBadge">Order updates</div>
                            <div className="authBadge">Wishlist</div>
                        </div>
                    </div>
                </section>

                <section className="authCard" aria-label="Sign up form">
                    <div className="authCardHeader">
                        <div>
                            <div className="authTitle">Sign up</div>
                            <div className="authSubtitle muted">Takes less than a minute.</div>
                        </div>
                        <div className="authTabs" role="tablist" aria-label="Auth tabs">
                            <Link className="authTab" to="/login" role="tab" aria-selected="false">
                                Login
                            </Link>
                            <Link className="authTab active" to="/signup" role="tab" aria-selected="true">
                                Sign up
                            </Link>
                        </div>
                    </div>

                    <form className="authForm" onSubmit={onSubmit}>
                        <label className="authField">
                            <span className="authLabel">Name</span>
                            <input
                                type="text"
                                name="name"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your name"
                                required
                            />
                        </label>

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

                        <div className="authTwoCol">
                            <label className="authField">
                                <span className="authLabel">Password</span>
                                <input
                                    type="password"
                                    name="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    minLength={8}
                                    required
                                />
                            </label>

                            <label className="authField">
                                <span className="authLabel">Confirm</span>
                                <input
                                    type="password"
                                    name="confirm"
                                    autoComplete="new-password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="Repeat password"
                                    minLength={8}
                                    required
                                />
                            </label>
                        </div>

                        {error ? <div className="error">{error}</div> : null}

                        <div className="authActions">
                            <button className="button buttonPrimary" type="submit" disabled={loading}>
                                {loading ? 'Creating…' : 'Create account'}
                            </button>
                            <Link className="authLink" to="/login">
                                Already have an account? Sign in
                            </Link>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}

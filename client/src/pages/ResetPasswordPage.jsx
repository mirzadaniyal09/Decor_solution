import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api.js';
import { setAuth } from '../lib/auth.js';

function useQuery() {
    const { search } = useLocation();
    return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const query = useQuery();

    const [token, setToken] = useState(() => query.get('token') || '');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function onSubmit(e) {
        e.preventDefault();
        setError('');

        if (!token.trim()) {
            setError('Reset token is required');
            return;
        }

        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const data = await apiPost('/api/auth/reset-password', { token, password });
            setAuth({ token: data?.token, user: data?.user });
            navigate('/account', { replace: true });
        } catch (err) {
            setError(err?.message || 'Reset failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="authShell">
            <div className="authLayout">
                <section className="authHero" aria-label="Set new password">
                    <div className="authHeroInner">
                        <div className="authKicker">Alif Store</div>
                        <h1 className="authHeroTitle">Set a new password</h1>
                        <p className="authHeroText">
                            Paste the reset token and choose a new password.
                        </p>
                        <div className="authHeroBadges">
                            <div className="authBadge">One-time token</div>
                            <div className="authBadge">30-minute expiry</div>
                            <div className="authBadge">Auto sign-in</div>
                        </div>
                    </div>
                </section>

                <section className="authCard" aria-label="Reset password form">
                    <div className="authCardHeader">
                        <div>
                            <div className="authTitle">Reset password</div>
                            <div className="authSubtitle muted">Choose something strong.</div>
                        </div>
                    </div>

                    <form className="authForm" onSubmit={onSubmit}>
                        <label className="authField">
                            <span className="authLabel">Reset token</span>
                            <input
                                type="text"
                                name="token"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                placeholder="Paste token"
                                required
                            />
                        </label>

                        <div className="authTwoCol">
                            <label className="authField">
                                <span className="authLabel">New password</span>
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
                                {loading ? 'Updating…' : 'Update password'}
                            </button>
                            <Link className="authLink" to="/login">Back to login</Link>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}

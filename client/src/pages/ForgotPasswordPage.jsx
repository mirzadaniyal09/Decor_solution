import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../lib/api.js';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [done, setDone] = useState(false);

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setResetToken('');
        setLoading(true);
        try {
            const data = await apiPost('/api/auth/forgot-password', { email });
            setDone(true);
            if (data?.resetToken) setResetToken(data.resetToken);
        } catch (err) {
            setError(err?.message || 'Request failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="authShell">
            <div className="authLayout">
                <section className="authHero" aria-label="Reset password">
                    <div className="authHeroInner">
                        <div className="authKicker">Alif Store</div>
                        <h1 className="authHeroTitle">Reset your password</h1>
                        <p className="authHeroText">
                            Enter your email and we’ll send a reset link. In development mode, we’ll show the reset token on this screen.
                        </p>
                        <div className="authHeroBadges">
                            <div className="authBadge">Fast</div>
                            <div className="authBadge">Secure</div>
                            <div className="authBadge">No account leaks</div>
                        </div>
                    </div>
                </section>

                <section className="authCard" aria-label="Forgot password form">
                    <div className="authCardHeader">
                        <div>
                            <div className="authTitle">Forgot password</div>
                            <div className="authSubtitle muted">We’ll help you get back in.</div>
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

                        {error ? <div className="error">{error}</div> : null}
                        {done ? (
                            <div className="success">
                                If an account exists for this email, a reset link has been generated.
                            </div>
                        ) : null}

                        {resetToken ? (
                            <div className="authDevBox" aria-label="Development reset token">
                                <div className="authDevTitle">Dev reset token</div>
                                <div className="authDevToken">{resetToken}</div>
                                <div className="muted" style={{ fontSize: 13 }}>
                                    Go to <Link className="authLink" to={`/reset-password?token=${encodeURIComponent(resetToken)}`}>Reset password</Link>
                                </div>
                            </div>
                        ) : null}

                        <div className="authActions">
                            <button className="button buttonPrimary" type="submit" disabled={loading}>
                                {loading ? 'Sending…' : 'Send reset link'}
                            </button>
                            <Link className="authLink" to="/login">Back to login</Link>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}

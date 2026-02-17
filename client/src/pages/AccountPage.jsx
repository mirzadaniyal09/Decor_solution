import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api.js';
import { clearAuth, getStoredUser } from '../lib/auth.js';

export default function AccountPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(() => getStoredUser());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');

        apiGet('/api/auth/me')
            .then((data) => {
                if (cancelled) return;
                setUser(data?.user || null);
            })
            .catch((e) => {
                if (cancelled) return;
                setError(e?.message || 'Failed to load account');
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <div className="stack">
            <div className="pageTitleRow">
                <h1 className="pageTitle">My Account</h1>
                <button
                    className="button"
                    type="button"
                    onClick={() => {
                        clearAuth();
                        navigate('/', { replace: true });
                    }}
                >
                    Log out
                </button>
            </div>

            {loading ? <div className="muted">Loading…</div> : null}
            {error ? <div className="error">{error}</div> : null}

            {!loading && !error ? (
                <div className="authCard" style={{ maxWidth: 720 }}>
                    <div className="authTitle" style={{ marginBottom: 8 }}>Profile</div>
                    <div className="muted" style={{ marginBottom: 18 }}>Signed in details</div>

                    <div className="accountGrid">
                        <div className="accountLabel">Name</div>
                        <div>{user?.name || '—'}</div>
                        <div className="accountLabel">Email</div>
                        <div>{user?.email || '—'}</div>
                        <div className="accountLabel">Role</div>
                        <div>{user?.role || 'customer'}</div>
                    </div>

                    <div className="row" style={{ marginTop: 18 }}>
                        <button
                            className="button"
                            type="button"
                            onClick={async () => {
                                setLoading(true);
                                setError('');
                                try {
                                    const data = await apiGet('/api/auth/me');
                                    setUser(data?.user || null);
                                } catch (e) {
                                    setError(e?.message || 'Failed to refresh');
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

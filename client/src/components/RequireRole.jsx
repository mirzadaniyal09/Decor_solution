import { Navigate, useLocation } from 'react-router-dom';
import { getStoredUser, isLoggedIn } from '../lib/auth.js';

export default function RequireRole({ role, children }) {
    const location = useLocation();

    if (!isLoggedIn()) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
    }

    const user = getStoredUser();
    if (!user || user.role !== role) {
        return <Navigate to="/account" replace />;
    }

    return children;
}

const TOKEN_KEY = 'decor_solution_token';
const USER_KEY = 'decor_solution_user';

function safeJsonParse(value) {
    if (!value) return null;
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

export function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
}

export function getStoredUser() {
    return safeJsonParse(localStorage.getItem(USER_KEY));
}

export function setAuth({ token, user }) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

export function isLoggedIn() {
    return Boolean(getToken());
}

// ============================================
// AUTHENTICATION - JWT with Backend
// ============================================

const API_URL = 'https://church-cms-api-11h5.onrender.com/api';

function isAuthenticated() {
    const token = localStorage.getItem('token');
    return token !== null && token !== undefined && token !== '';
}

function getCurrentUser() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch {
        return null;
    }
}

function getToken() {
    return localStorage.getItem('token');
}

async function login(email, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        return data;
    } catch (error) {
        throw error;
    }
}

async function register(name, email, password, role) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role: role || 'member' })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Registration failed');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../auth/login.html';
}

function updateSidebarUser() {
    const user = getCurrentUser();
    if (user) {
        const avatarEl = document.getElementById('userAvatar');
        const nameEl = document.getElementById('userName');
        const roleEl = document.getElementById('userRole');

        if (avatarEl) avatarEl.textContent = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        if (nameEl) nameEl.textContent = user.name || 'User';
        if (roleEl) roleEl.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Member';
    }
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

async function apiRequest(endpoint, options = {}) {
    const headers = getAuthHeaders();
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Request failed');
    }

    return data;
}
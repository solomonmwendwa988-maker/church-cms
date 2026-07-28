// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(amount, currency) {
    currency = currency || 'KES';
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const diff = now - new Date(timestamp);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return days + 'd ago';
    if (hours > 0) return hours + 'h ago';
    if (minutes > 0) return minutes + 'm ago';
    return 'Just now';
}

function generateReceiptNumber() {
    return 'RCP-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
    return /^(07|01)\d{8}$/.test(phone);
}
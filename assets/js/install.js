// ============================================
// INSTALL BUTTON LOGIC - Complete
// ============================================

// Variables
let deferredPrompt;
let isAppInstalled = false;
let installBannerDismissed = localStorage.getItem('installBannerDismissed') === 'true';

// DOM Elements
const installBtn = document.getElementById('installBtn');
const installBanner = document.getElementById('installBanner');

// ============================================
// MAIN FUNCTIONS
// ============================================

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                hideInstallUI();
                showToast('App installed successfully!', 'success');
            } else {
                console.log('User dismissed the install prompt');
            }
            deferredPrompt = null;
        });
    } else if (isIOS()) {
        showToast('Tap the Share button in Safari, then select "Add to Home Screen"', 'info', 5000);
    } else {
        showToast('Install prompt not available. Open this page in Chrome or Edge.', 'warning', 4000);
    }
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function showInstallUI() {
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
    if (installBanner && !installBannerDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
        installBanner.style.display = 'block';
    }
}

function hideInstallUI() {
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    if (installBanner) {
        installBanner.style.display = 'none';
    }
}

function dismissInstallBanner() {
    localStorage.setItem('installBannerDismissed', 'true');
    installBannerDismissed = true;
    if (installBanner) {
        installBanner.style.display = 'none';
    }
}

function checkIfInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        isAppInstalled = true;
        hideInstallUI();
        return true;
    }
    return false;
}

function getPlatform() {
    if (isIOS()) return 'iOS';
    if (/android/i.test(navigator.userAgent)) return 'Android';
    if (/windows/i.test(navigator.userAgent)) return 'Windows';
    return 'Other';
}

// ============================================
// EVENT LISTENERS
// ============================================

// Before install prompt
window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    console.log('App can be installed on', getPlatform());

    if (!checkIfInstalled()) {
        showInstallUI();
    }

    try {
        localStorage.setItem('canInstall', 'true');
    } catch(err) {}
});

// App installed
window.addEventListener('appinstalled', function() {
    console.log('App installed successfully');
    isAppInstalled = true;
    hideInstallUI();

    try {
        localStorage.setItem('appInstalled', 'true');
        localStorage.setItem('canInstall', 'false');
    } catch(err) {}

    showToast('App installed successfully!', 'success');
});

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already installed
    if (checkIfInstalled()) {
        return;
    }

    // Check if can install from localStorage
    try {
        if (localStorage.getItem('canInstall') === 'true') {
            showInstallUI();
        }
    } catch(err) {}

    // Check if app is already installed from localStorage
    try {
        if (localStorage.getItem('appInstalled') === 'true') {
            hideInstallUI();
        }
    } catch(err) {}

    // iOS detection
    if (isIOS() && !window.matchMedia('(display-mode: standalone)').matches) {
        if (installBtn) {
            installBtn.style.display = 'flex';
            installBtn.innerHTML = '<i class="fas fa-download"></i> Install';
        }
        showInstallUI();
    }

    // Android Chrome - already handled by beforeinstallprompt
    if (/android/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches) {
        if (!deferredPrompt) {
            // If no prompt, show install button anyway
            showInstallUI();
        }
    }

    // Windows/Desktop - show install button if not installed
    if (!isIOS() && !/android/i.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches) {
        // Check if Chrome/Edge on desktop
        if (deferredPrompt) {
            showInstallUI();
        }
    }
});

// ============================================
// TOAST SYSTEM (if not already defined)
// ============================================

if (typeof showToast !== 'function') {
    function showToast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;
        var container = document.getElementById('toastContainer');
        if (!container) return;
        var toast = document.createElement('div');
        toast.className = 'toast ' + type;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            setTimeout(function() { toast.remove(); }, 300);
        }, duration);
    }
}
// ============================================
// APP CONFIGURATION
// ============================================

const App = {
    currentPage: 'dashboard',
    darkMode: localStorage.getItem('theme') === 'dark',
    sidebarOpen: false
};

// ============================================
// THEME MANAGEMENT
// ============================================

function toggleTheme() {
    App.darkMode = !App.darkMode;
    document.documentElement.setAttribute('data-theme', App.darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', App.darkMode ? 'dark' : 'light');
    const icon = document.querySelector('#themeBtn i');
    if (icon) {
        icon.className = App.darkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
    showToast(App.darkMode ? 'Dark mode activated' : 'Light mode activated', 'success');
}

(function loadTheme() {
    if (App.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        const icon = document.querySelector('#themeBtn i');
        if (icon) icon.className = 'fas fa-sun';
    }
})();

// ============================================
// SIDEBAR MANAGEMENT
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    App.sidebarOpen = !App.sidebarOpen;
    sidebar.classList.toggle('open');
    sidebar.classList.toggle('closed');
}

function closeSidebarOutside(e) {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.menu-toggle');
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
        App.sidebarOpen = false;
        document.removeEventListener('click', closeSidebarOutside);
    }
}

document.addEventListener('click', closeSidebarOutside);

// ============================================
// NAVIGATION
// ============================================

function navigateTo(page) {
    if (page === 'settings') {
        window.location.href = '../settings/index.html';
        return;
    }
    App.currentPage = page;
    document.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.remove('active');
        if (el.dataset.page === page) {
            el.classList.add('active');
        }
    });
    const titles = {
        dashboard: 'Dashboard',
        members: 'Members',
        attendance: 'Attendance',
        finance: 'Finance',
        events: 'Events',
        media: 'Media Library',
        reports: 'Reports',
        settings: 'Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'Dashboard';
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebar').classList.add('closed');
        App.sidebarOpen = false;
    }
    loadPageContent(page);
}

function loadPageContent(page) {
    const container = document.getElementById('pageContent');
    if (!container) return;
    switch (page) {
        case 'dashboard': renderDashboard(container); break;
        case 'members': renderMembersPage(container); break;
        case 'attendance': renderAttendancePage(container); break;
        case 'finance': renderFinancePage(container); break;
        case 'events': renderEventsPage(container); break;
        case 'media': renderMediaPage(container); break;
        case 'reports': renderReportsPage(container); break;
        default: container.innerHTML = '<h2>Page not found</h2>';
    }
}

// ============================================
// DASHBOARD
// ============================================

function renderDashboard(container) {
    const members = DB.getAll('members');
    const events = DB.getAll('events');
    const giving = DB.getAll('giving');
    const attendance = DB.getAll('attendance');
    const media = DB.getAll('media');

    const totalMembers = members.length;
    const activeMembers = members.filter(function(m) { return m.status === 'Active'; }).length;
    const totalGiving = giving.reduce(function(sum, g) { return sum + (parseFloat(g.amount) || 0); }, 0);
    const upcomingEvents = events.filter(function(e) { return e.status === 'Upcoming'; }).length;
    const totalAttended = attendance.filter(function(a) { return a.status === 'Present'; }).length;
    const totalMedia = media.length;

    updateBadges();

    container.innerHTML = `
        <section class="stats-grid">
            <div class="stat-card" onclick="navigateTo('members')">
                <div class="stat-top"><div class="stat-icon"><i class="fas fa-users"></i></div></div>
                <div class="stat-value">${totalMembers}</div>
                <div class="stat-label">Total Members</div>
                <span class="stat-change positive">${activeMembers} active</span>
            </div>
            <div class="stat-card" onclick="navigateTo('events')">
                <div class="stat-top"><div class="stat-icon"><i class="fas fa-calendar-alt"></i></div></div>
                <div class="stat-value">${upcomingEvents}</div>
                <div class="stat-label">Upcoming Events</div>
                <span class="stat-change">${events.length > 0 ? events[0].title : 'None'}</span>
            </div>
            <div class="stat-card" onclick="navigateTo('finance')">
                <div class="stat-top"><div class="stat-icon"><i class="fas fa-coins"></i></div></div>
                <div class="stat-value">${formatCurrency(totalGiving)}</div>
                <div class="stat-label">Total Giving</div>
                <span class="stat-change positive">${giving.length} transactions</span>
            </div>
            <div class="stat-card" onclick="navigateTo('attendance')">
                <div class="stat-top"><div class="stat-icon"><i class="fas fa-clipboard-check"></i></div></div>
                <div class="stat-value">${attendance.length}</div>
                <div class="stat-label">Attendance Records</div>
                <span class="stat-change positive">${totalAttended} present</span>
            </div>
            <div class="stat-card" onclick="navigateTo('media')">
                <div class="stat-top"><div class="stat-icon"><i class="fas fa-photo-video"></i></div></div>
                <div class="stat-value">${totalMedia}</div>
                <div class="stat-label">Media Files</div>
                <span class="stat-change">${media.length > 0 ? 'Uploaded' : 'Empty'}</span>
            </div>
        </section>
        <section class="dashboard-grid">
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-clock"></i> Recent Activity</h3>
                    <button class="card-action" onclick="navigateTo('reports')">View All</button>
                </div>
                <div class="item-list">
                    ${giving.slice(0, 3).map(function(g) {
                        return `<div class="item"><div class="item-icon"><i class="fas fa-hand-holding-heart"></i></div><div class="item-content"><div class="item-title">${g.memberName} gave ${formatCurrency(g.amount)}</div><div class="item-meta">${formatDate(g.date)} · ${g.category}</div></div><span class="item-status active">${g.paymentMethod}</span></div>`;
                    }).join('') || '<div style="padding:16px;text-align:center;color:var(--text-muted);">No recent giving</div>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button class="btn-primary" onclick="window.location.href='../members/add.html'" style="width:100%;justify-content:center;"><i class="fas fa-user-plus"></i> Add Member</button>
                    <button class="btn-primary" onclick="window.location.href='../events/add.html'" style="width:100%;justify-content:center;"><i class="fas fa-calendar-plus"></i> Create Event</button>
                    <button class="btn-primary" onclick="window.location.href='../finance/add.html'" style="width:100%;justify-content:center;"><i class="fas fa-hand-holding-heart"></i> Record Giving</button>
                </div>
            </div>
        </section>
    `;
}

// ============================================
// MEMBERS PAGE
// ============================================

function renderMembersPage(container) {
    const members = DB.getAll('members');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-users"></i> All Members</h3>
                <button class="btn-primary" onclick="window.location.href='../members/add.html'"><i class="fas fa-plus"></i> Add Member</button>
            </div>
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Join Date</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${members.length > 0 ? members.map(function(m) {
                            return `<tr><td><strong>${m.firstName} ${m.lastName}</strong></td><td>${m.email || 'N/A'}</td><td>${m.phone || 'N/A'}</td><td>${formatDate(m.joinDate)}</td><td><span class="item-status ${m.status === 'Active' ? 'active' : 'pending'}">${m.status}</span></td><td><button class="btn-sm" onclick="window.location.href='../members/profile.html?id=${m.id}'">View</button><button class="btn-sm" onclick="window.location.href='../members/add.html?id=${m.id}'">Edit</button><button class="btn-sm" onclick="deleteMember('${m.id}')" style="color:var(--danger);">Delete</button></td></tr>`;
                        }).join('') : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No members found</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function deleteMember(id) {
    if (confirm('Delete this member?')) {
        DB.delete('members', id);
        showToast('Member deleted successfully', 'success');
        loadPageContent('members');
        updateBadges();
    }
}

// ============================================
// ATTENDANCE PAGE
// ============================================

function renderAttendancePage(container) {
    const attendance = DB.getAll('attendance');
    const totalPresent = attendance.filter(function(a) { return a.status === 'Present'; }).length;
    const totalAbsent = attendance.filter(function(a) { return a.status === 'Absent'; }).length;
    const totalLate = attendance.filter(function(a) { return a.status === 'Late'; }).length;

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value" style="color:var(--success);">${totalPresent}</div><div class="stat-label">Present</div></div>
            <div class="stat-card"><div class="stat-value" style="color:var(--danger);">${totalAbsent}</div><div class="stat-label">Absent</div></div>
            <div class="stat-card"><div class="stat-value" style="color:var(--warning);">${totalLate}</div><div class="stat-label">Late</div></div>
            <div class="stat-card"><div class="stat-value">${attendance.length}</div><div class="stat-label">Total Records</div></div>
        </div>
        <div style="margin-bottom:20px;"><button class="btn-primary" onclick="window.location.href='checkin.html'"><i class="fas fa-clipboard-check"></i> Mark Attendance</button></div>
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-clipboard-list"></i> Attendance Records</h3></div>
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Member</th><th>Service Type</th><th>Date</th><th>Status</th><th>Check In</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${attendance.length > 0 ? attendance.slice().reverse().map(function(a) {
                            return `<tr><td>${a.memberName || 'Unknown'}</td><td>${a.serviceType}</td><td>${formatDate(a.date)}</td><td><span class="item-status ${a.status === 'Present' ? 'active' : a.status === 'Late' ? 'pending' : 'completed'}">${a.status}</span></td><td>${a.checkInTime || 'N/A'}</td><td><button class="btn-sm" onclick="deleteAttendance('${a.id}')" style="color:var(--danger);">Delete</button></td></tr>`;
                        }).join('') : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No attendance records found</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function deleteAttendance(id) {
    if (confirm('Delete this attendance record?')) {
        DB.delete('attendance', id);
        showToast('Attendance record deleted', 'success');
        loadPageContent('attendance');
        updateBadges();
    }
}

// ============================================
// FINANCE PAGE
// ============================================

function renderFinancePage(container) {
    const giving = DB.getAll('giving');
    const totalGiving = giving.reduce(function(sum, g) { return sum + (parseFloat(g.amount) || 0); }, 0);

    container.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div class="stat-value" style="color:var(--success);">${formatCurrency(totalGiving)}</div><div class="stat-label">Total Giving</div></div>
            <div class="stat-card"><div class="stat-value">${giving.length}</div><div class="stat-label">Transactions</div></div>
        </div>
        <div style="margin-bottom:20px;">
            <button class="btn-primary" onclick="window.location.href='add.html?type=giving'"><i class="fas fa-hand-holding-heart"></i> Record Giving</button>
        </div>
        <div class="card">
            <div class="card-header"><h3><i class="fas fa-hand-holding-heart"></i> Giving Records</h3></div>
            <div class="table-wrapper">
                <table>
                    <thead><tr><th>Member</th><th>Category</th><th>Amount</th><th>Payment</th><th>Date</th><th>Actions</th></tr></thead>
                    <tbody>
                        ${giving.length > 0 ? giving.slice().reverse().map(function(g) {
                            return `<tr><td>${g.memberName || 'Anonymous'}</td><td>${g.category}</td><td><strong>${formatCurrency(g.amount)}</strong></td><td>${g.paymentMethod}</td><td>${formatDate(g.date)}</td><td><button class="btn-sm" onclick="editGiving('${g.id}')">Edit</button><button class="btn-sm" onclick="deleteGiving('${g.id}')" style="color:var(--danger);">Delete</button></td></tr>`;
                        }).join('') : `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No giving records found</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function deleteGiving(id) {
    if (confirm('Delete this giving record?')) {
        DB.delete('giving', id);
        showToast('Giving record deleted', 'success');
        loadPageContent('finance');
        updateBadges();
    }
}

function editGiving(id) {
    window.location.href = 'add.html?type=giving&id=' + id;
}

// ============================================
// EVENTS PAGE
// ============================================

function renderEventsPage(container) {
    const events = DB.getAll('events');

    container.innerHTML = `
        <div style="margin-bottom:20px;"><button class="btn-primary" onclick="window.location.href='add.html'"><i class="fas fa-plus"></i> Create Event</button></div>
        <div class="dashboard-grid">
            ${events.length > 0 ? events.map(function(e) {
                return `<div class="card"><h3 style="font-size:1.1rem;">${e.title}</h3><p style="color:var(--text-secondary);">${e.description || 'No description'}</p><div style="font-size:0.85rem;color:var(--text-secondary);"><div><i class="fas fa-calendar"></i> ${formatDate(e.startDate)}</div><div><i class="fas fa-map-marker-alt"></i> ${e.venue || 'N/A'}</div></div><div style="margin-top:12px;display:flex;gap:8px;"><button class="btn-sm" onclick="editEvent('${e.id}')">Edit</button><button class="btn-sm" onclick="deleteEvent('${e.id}')" style="color:var(--danger);">Delete</button></div></div>`;
            }).join('') : `<div style="text-align:center;padding:60px;color:var(--text-muted);">No events found</div>`}
        </div>
    `;
}

function deleteEvent(id) {
    if (confirm('Delete this event?')) {
        DB.delete('events', id);
        showToast('Event deleted', 'success');
        loadPageContent('events');
        updateBadges();
    }
}

function editEvent(id) {
    window.location.href = 'add.html?id=' + id;
}

// ============================================
// MEDIA PAGE
// ============================================

function renderMediaPage(container) {
    const media = DB.getAll('media');
    container.innerHTML = `
        <div class="card">
            <div class="card-header">
                <h3><i class="fas fa-images"></i> Media Gallery</h3>
                <button class="btn-primary" onclick="window.location.href='../media/index.html'"><i class="fas fa-external-link-alt"></i> Open Media Library</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;">
                ${media.length > 0 ? media.slice(0, 6).map(function(m) {
                    if (m.type === 'image') {
                        return '<div style="border-radius:var(--radius-sm);overflow:hidden;height:120px;"><img src="' + m.data + '" style="width:100%;height:100%;object-fit:cover;"></div>';
                    }
                    return '<div style="border-radius:var(--radius-sm);overflow:hidden;height:120px;background:var(--border);display:flex;align-items:center;justify-content:center;font-size:2rem;"><i class="fas fa-file"></i></div>';
                }).join('') : '<div style="grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted);">No media uploaded</div>'}
            </div>
            <div style="margin-top:12px;text-align:center;color:var(--text-secondary);">${media.length} files in media library</div>
        </div>
    `;
}

// ============================================
// REPORTS PAGE
// ============================================

function renderReportsPage(container) {
    container.innerHTML = `
        <div class="dashboard-grid">
            <div class="card" onclick="generateReport('members')" style="cursor:pointer;text-align:center;padding:24px;">
                <div style="font-size:2.5rem;color:var(--primary);margin-bottom:8px;"><i class="fas fa-users"></i></div>
                <h3>Member Report</h3>
                <button class="btn-sm" style="margin-top:8px;">Generate</button>
            </div>
            <div class="card" onclick="generateReport('finance')" style="cursor:pointer;text-align:center;padding:24px;">
                <div style="font-size:2.5rem;color:var(--primary);margin-bottom:8px;"><i class="fas fa-coins"></i></div>
                <h3>Financial Report</h3>
                <button class="btn-sm" style="margin-top:8px;">Generate</button>
            </div>
        </div>
    `;
}

function generateReport(type) {
    switch (type) {
        case 'members': generateMemberReport(); break;
        case 'finance': generateFinanceReport(); break;
        default: showToast('Report type not found', 'error');
    }
}

function generateMemberReport() {
    const members = DB.getAll('members');
    const total = members.length;
    const active = members.filter(function(m) { return m.status === 'Active'; }).length;
    let report = 'MEMBER REPORT\n' + '='.repeat(40) + '\n\nTotal Members: ' + total + '\nActive: ' + active + '\nInactive: ' + (total - active) + '\n\nRecent Members:\n';
    members.slice(0, 10).forEach(function(m) { report += '  - ' + m.firstName + ' ' + m.lastName + ' (' + m.status + ')\n'; });
    alert(report);
    showToast('Member report generated', 'success');
}

function generateFinanceReport() {
    const giving = DB.getAll('giving');
    const total = giving.reduce(function(sum, g) { return sum + (parseFloat(g.amount) || 0); }, 0);
    let report = 'FINANCIAL REPORT\n' + '='.repeat(40) + '\n\nTotal Giving: ' + formatCurrency(total) + '\n\nGiving by Category:\n';
    const categories = {};
    giving.forEach(function(g) { categories[g.category] = (categories[g.category] || 0) + parseFloat(g.amount); });
    Object.entries(categories).forEach(function(entry) { report += '  - ' + entry[0] + ': ' + formatCurrency(entry[1]) + '\n'; });
    alert(report);
    showToast('Financial report generated', 'success');
}

// ============================================
// TOAST
// ============================================

function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function() {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(30px)';
        setTimeout(function() { toast.remove(); }, 300);
    }, duration);
}

function showNotification() {
    const dot = document.getElementById('notifDot');
    if (dot) dot.style.display = 'none';
    showToast('You have 3 new notifications', 'info');
}

// ============================================
// UPDATE BADGES
// ============================================

function updateBadges() {
    const memberBadge = document.getElementById('memberBadge');
    const eventBadge = document.getElementById('eventBadge');
    const financeBadge = document.getElementById('financeBadge');
    const mediaBadge = document.getElementById('mediaBadge');

    if (memberBadge) memberBadge.textContent = DB.getAll('members').length;
    if (eventBadge) eventBadge.textContent = DB.getAll('events').filter(function(e) { return e.status === 'Upcoming'; }).length;
    if (financeBadge) financeBadge.textContent = DB.getAll('giving').length;
    if (mediaBadge) mediaBadge.textContent = DB.getAll('media').length;
}

// ============================================
// INSTALL BUTTON LOGIC
// ============================================

let deferredPrompt;
let installBannerDismissed = localStorage.getItem('installBannerDismissed') === 'true';

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function(choiceResult) {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted install');
                hideInstallUI();
                showToast('App installed successfully!', 'success');
            }
            deferredPrompt = null;
        });
    } else if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
        showToast('Tap Share button in Safari, then select "Add to Home Screen"', 'info', 5000);
    } else {
        showToast('Install prompt not available. Open in Chrome or Edge.', 'warning', 4000);
    }
}

function showInstallUI() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
    const banner = document.getElementById('installBanner');
    if (banner && !installBannerDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
        banner.style.display = 'block';
    }
}

function hideInstallUI() {
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function dismissInstallBanner() {
    localStorage.setItem('installBannerDismissed', 'true');
    installBannerDismissed = true;
    const banner = document.getElementById('installBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        showInstallUI();
    }
});

window.addEventListener('appinstalled', function() {
    hideInstallUI();
    showToast('App installed successfully!', 'success');
});

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        hideInstallUI();
    }

    // Load dashboard content
    const container = document.getElementById('pageContent');
    if (container) {
        renderDashboard(container);
    }

    updateBadges();

    // Welcome toast
    setTimeout(function() {
        showToast('Welcome to Victory Life CMS', 'success');
    }, 500);
});
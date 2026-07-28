// ============================================
// APP CONFIGURATION
// ============================================

var App = {
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

    var icon = document.querySelector('#themeBtn i');
    if (icon) {
        icon.className = App.darkMode ? 'fas fa-sun' : 'fas fa-moon';
    }

    var darkSwitch = document.getElementById('darkModeSwitch');
    if (darkSwitch) {
        darkSwitch.checked = App.darkMode;
    }

    showToast(App.darkMode ? 'Dark mode activated' : 'Light mode activated', 'success');
}

(function loadTheme() {
    if (App.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        var icon = document.querySelector('#themeBtn i');
        if (icon) icon.className = 'fas fa-sun';
    }
})();

// ============================================
// SIDEBAR MANAGEMENT
// ============================================

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    App.sidebarOpen = !App.sidebarOpen;
    sidebar.classList.toggle('open');
    sidebar.classList.toggle('closed');

    if (App.sidebarOpen) {
        document.addEventListener('click', closeSidebarOutside);
    } else {
        document.removeEventListener('click', closeSidebarOutside);
    }
}

function closeSidebarOutside(e) {
    var sidebar = document.getElementById('sidebar');
    var toggle = document.querySelector('.menu-toggle');
    if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
        App.sidebarOpen = false;
        document.removeEventListener('click', closeSidebarOutside);
    }
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        var sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
        App.sidebarOpen = false;
    }
});

// ============================================
// NAVIGATION
// ============================================

function navigateTo(page) {
    var reloadPages = ['settings', 'users', 'media', 'reports', 'sermons', 'analytics', 'mpesa', 'notifications'];
    if (reloadPages.indexOf(page) !== -1) {
        window.location.href = '../' + page + '/index.html';
        return;
    }

    App.currentPage = page;

    document.querySelectorAll('.nav-item').forEach(function(el) {
        el.classList.remove('active');
        if (el.dataset.page === page) {
            el.classList.add('active');
        }
    });

    var titles = {
        dashboard: 'Dashboard',
        members: 'Members',
        attendance: 'Attendance',
        finance: 'Finance',
        events: 'Events',
        media: 'Media Library',
        reports: 'Reports',
        settings: 'Settings'
    };

    var titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[page] || 'Dashboard';

    if (window.innerWidth <= 768) {
        var sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
        App.sidebarOpen = false;
    }

    loadPageContent(page);
}

function loadPageContent(page) {
    var container = document.getElementById('pageContent');
    if (!container) return;

    switch (page) {
        case 'dashboard':
            renderDashboard(container);
            break;
        case 'members':
            renderMembersPage(container);
            break;
        case 'attendance':
            renderAttendancePage(container);
            break;
        case 'finance':
            renderFinancePage(container);
            break;
        case 'events':
            renderEventsPage(container);
            break;
        case 'media':
            renderMediaPage(container);
            break;
        case 'reports':
            renderReportsPage(container);
            break;
        default:
            container.innerHTML = '<h2>Page not found</h2>';
    }
}

// ============================================
// SYNC STATUS
// ============================================

function updateSyncStatus(status) {
    var dot = document.getElementById('syncDot');
    var text = document.getElementById('syncText');
    if (!dot || !text) return;

    if (status === 'syncing') {
        dot.style.background = '#f59e0b';
        text.textContent = 'Syncing...';
        document.getElementById('syncBtn').style.opacity = '0.5';
        document.getElementById('syncBtn').disabled = true;
    } else if (status === 'synced') {
        dot.style.background = '#22c55e';
        text.textContent = 'Synced';
        document.getElementById('syncBtn').style.opacity = '1';
        document.getElementById('syncBtn').disabled = false;
    } else if (status === 'error') {
        dot.style.background = '#ef4444';
        text.textContent = 'Sync Error';
        document.getElementById('syncBtn').style.opacity = '1';
        document.getElementById('syncBtn').disabled = false;
    }
}

function manualSync() {
    updateSyncStatus('syncing');
    if (typeof Sync !== 'undefined' && Sync.manualSync) {
        Sync.manualSync();
        setTimeout(function() {
            updateSyncStatus('synced');
        }, 3000);
    } else {
        showToast('Sync module not available', 'error');
        updateSyncStatus('error');
    }
}

// ============================================
// ONLINE USERS
// ============================================

function updateOnlineUsers(users) {
    var container = document.getElementById('onlineUsers');
    if (!container) return;

    var count = users ? users.length : 0;
    var names = users ? users.map(function(u) { return u.name; }).join(', ') : '';

    container.innerHTML = '<span style="color:#22c55e;">●</span> <span>' + count + ' online</span>' + (names ? ' <span style="color:#94a3b8;font-size:0.75rem;">(' + names + ')</span>' : '');
}

// ============================================
// DASHBOARD
// ============================================

function renderDashboard(container) {
    var members = DB.getAll('members');
    var events = DB.getAll('events');
    var giving = DB.getAll('giving');
    var attendance = DB.getAll('attendance');
    var media = DB.getAll('media');

    var totalMembers = members.length;
    var activeMembers = members.filter(function(m) { return m.status === 'Active'; }).length;
    var totalGiving = giving.reduce(function(sum, g) { return sum + (parseFloat(g.amount) || 0); }, 0);
    var upcomingEvents = events.filter(function(e) { return e.status === 'Upcoming'; }).length;
    var totalAttended = attendance.filter(function(a) { return a.status === 'Present'; }).length;
    var totalMedia = media.length;

    updateBadges();

    var recentGiving = giving.slice(0, 3);

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
                    ${recentGiving.length > 0 ? recentGiving.map(function(g) {
                        return '<div class="item"><div class="item-icon"><i class="fas fa-hand-holding-heart"></i></div><div class="item-content"><div class="item-title">' + g.memberName + ' gave ' + formatCurrency(g.amount) + '</div><div class="item-meta">' + formatDate(g.date) + ' · ' + g.category + '</div></div><span class="item-status active">' + g.paymentMethod + '</span></div>';
                    }).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted);">No recent giving</div>'}
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button class="btn-primary" onclick="window.location.href='../members/add.html'" style="width:100%;justify-content:center;"><i class="fas fa-user-plus"></i> Add Member</button>
                    <button class="btn-primary" onclick="window.location.href='../events/add.html'" style="width:100%;justify-content:center;background:var(--success);"><i class="fas fa-calendar-plus"></i> Create Event</button>
                    <button class="btn-primary" onclick="window.location.href='../finance/add.html'" style="width:100%;justify-content:center;background:var(--warning);"><i class="fas fa-hand-holding-heart"></i> Record Giving</button>
                    <button class="btn-secondary" onclick="window.location.href='../attendance/checkin.html'" style="width:100%;justify-content:center;"><i class="fas fa-clipboard-check"></i> Mark Attendance</button>
                    <button class="btn-secondary" onclick="window.location.href='../users/index.html'" style="width:100%;justify-content:center;"><i class="fas fa-user-cog"></i> Manage Users</button>
                    <button class="btn-secondary" onclick="manualSync()" style="width:100%;justify-content:center;background:var(--primary);color:white;">
                        <i class="fas fa-sync"></i> Sync Data
                    </button>
                </div>
            </div>
        </section>
    `;
}

// ============================================
// MEMBERS PAGE
// ============================================

function renderMembersPage(container) {
    var members = DB.getAll('members');

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
                            return '<tr><td><strong>' + m.firstName + ' ' + m.lastName + '</strong></td><td>' + (m.email || 'N/A') + '</td><td>' + (m.phone || 'N/A') + '</td><td>' + formatDate(m.joinDate) + '</td><td><span class="item-status ' + (m.status === 'Active' ? 'active' : 'pending') + '">' + m.status + '</span></td><td><button class="btn-sm" onclick="window.location.href=\'../members/profile.html?id=' + m.id + '\'">View</button><button class="btn-sm" onclick="window.location.href=\'../members/add.html?id=' + m.id + '\'">Edit</button><button class="btn-sm" onclick="deleteMember(\'' + m.id + '\')" style="color:var(--danger);">Delete</button></td></tr>';
                        }).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No members found</td></tr>'}
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
    var attendance = DB.getAll('attendance');
    var totalPresent = attendance.filter(function(a) { return a.status === 'Present'; }).length;
    var totalAbsent = attendance.filter(function(a) { return a.status === 'Absent'; }).length;
    var totalLate = attendance.filter(function(a) { return a.status === 'Late'; }).length;

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
                            return '<tr><td>' + (a.memberName || 'Unknown') + '</td><td>' + a.serviceType + '</td><td>' + formatDate(a.date) + '</td><td><span class="item-status ' + (a.status === 'Present' ? 'active' : a.status === 'Late' ? 'pending' : 'completed') + '">' + a.status + '</span></td><td>' + (a.checkInTime || 'N/A') + '</td><td><button class="btn-sm" onclick="deleteAttendance(\'' + a.id + '\')" style="color:var(--danger);">Delete</button></td></tr>';
                        }).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No attendance records found</td></tr>'}
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
    var giving = DB.getAll('giving');
    var totalGiving = giving.reduce(function(sum, g) { return sum + (parseFloat(g.amount) || 0); }, 0);

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
                            return '<tr><td>' + (g.memberName || 'Anonymous') + '</td><td>' + g.category + '</td><td><strong>' + formatCurrency(g.amount) + '</strong></td><td>' + g.paymentMethod + '</td><td>' + formatDate(g.date) + '</td><td><button class="btn-sm" onclick="editGiving(\'' + g.id + '\')">Edit</button><button class="btn-sm" onclick="deleteGiving(\'' + g.id + '\')" style="color:var(--danger);">Delete</button></td></tr>';
                        }).join('') : '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">No giving records found</td></tr>'}
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
    var events = DB.getAll('events');

    container.innerHTML = `
        <div style="margin-bottom:20px;"><button class="btn-primary" onclick="window.location.href='add.html'"><i class="fas fa-plus"></i> Create Event</button></div>
        <div class="dashboard-grid">
            ${events.length > 0 ? events.map(function(e) {
                return '<div class="card"><h3 style="font-size:1.1rem;">' + e.title + '</h3><p style="color:var(--text-secondary);">' + (e.description || 'No description') + '</p><div style="font-size:0.85rem;color:var(--text-secondary);"><div><i class="fas fa-calendar"></i> ' + formatDate(e.startDate) + '</div><div><i class="fas fa-map-marker-alt"></i> ' + (e.venue || 'N/A') + '</div></div><div style="margin-top:12px;display:flex;gap:8px;"><button class="btn-sm" onclick="editEvent(\'' + e.id + '\')">Edit</button><button class="btn-sm" onclick="deleteEvent(\'' + e.id + '\')" style="color:var(--danger);">Delete</button></div></div>';
            }).join('') : '<div style="text-align:center;padding:60px;color:var(--text-muted);">No events found</div>'}
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
    var media = DB.getAll('media');

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
            <div class="card" onclick="generateReport('attendance')" style="cursor:pointer;text-align:center;padding:24px;">
                <div style="font-size:2.5rem;color:var(--primary);margin-bottom:8px;"><i class="fas fa-clipboard-check"></i></div>
                <h3>Attendance Report</h3>
                <button class="btn-sm" style="margin-top:8px;">Generate</button>
            </div>
        </div>
    `;
}

function generateReport(type) {
    var members, giving, attendance, report, categories, services;

    switch (type) {
        case 'members':
            members = DB.getAll('members');
            report = 'MEMBER REPORT\n' + '='.repeat(40) + '\n\nTotal Members: ' + members.length + '\nActive: ' + members.filter(function(m) { return m.status === 'Active'; }).length + '\nInactive: ' + members.filter(function(m) { return m.status === 'Inactive'; }).length + '\n\nRecent Members:\n';
            members.slice(0, 10).forEach(function(m) { report += '  - ' + m.firstName + ' ' + m.lastName + ' (' + m.status + ')\n'; });
            alert(report);
            showToast('Member report generated', 'success');
            break;

        case 'finance':
            giving = DB.getAll('giving');
            report = 'FINANCIAL REPORT\n' + '='.repeat(40) + '\n\nTotal Giving: ' + formatCurrency(giving.reduce(function(sum, g) { return sum + (parseFloat(g.amount) || 0); }, 0)) + '\n\nGiving by Category:\n';
            categories = {};
            giving.forEach(function(g) { categories[g.category] = (categories[g.category] || 0) + parseFloat(g.amount); });
            Object.keys(categories).forEach(function(key) { report += '  - ' + key + ': ' + formatCurrency(categories[key]) + '\n'; });
            alert(report);
            showToast('Financial report generated', 'success');
            break;

        case 'attendance':
            attendance = DB.getAll('attendance');
            report = 'ATTENDANCE REPORT\n' + '='.repeat(40) + '\n\nTotal Records: ' + attendance.length + '\nPresent: ' + attendance.filter(function(a) { return a.status === 'Present'; }).length + '\nAbsent: ' + attendance.filter(function(a) { return a.status === 'Absent'; }).length + '\nLate: ' + attendance.filter(function(a) { return a.status === 'Late'; }).length + '\n\nAttendance by Service Type:\n';
            services = {};
            attendance.forEach(function(a) { services[a.serviceType] = (services[a.serviceType] || 0) + 1; });
            Object.keys(services).forEach(function(key) { report += '  - ' + key + ': ' + services[key] + '\n'; });
            alert(report);
            showToast('Attendance report generated', 'success');
            break;

        default:
            showToast('Report type not found', 'error');
    }
}

// ============================================
// TOAST SYSTEM
// ============================================

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

function showNotification() {
    var dot = document.getElementById('notifDot');
    if (dot) dot.style.display = 'none';
    showToast('You have 3 new notifications', 'info');
}

// ============================================
// UPDATE BADGES
// ============================================

function updateBadges() {
    var badgeIds = ['memberBadge', 'eventBadge', 'financeBadge', 'mediaBadge', 'notifBadge', 'sermonBadge', 'mpesaBadge', 'userBadge'];
    var collections = ['members', 'events', 'giving', 'media', 'notifications', 'sermons', 'mpesaTransactions', 'users'];

    for (var i = 0; i < badgeIds.length; i++) {
        var el = document.getElementById(badgeIds[i]);
        if (!el) continue;

        var data = DB.getAll(collections[i]);
        if (collections[i] === 'events') {
            data = data.filter(function(e) { return e.status === 'Upcoming'; });
        } else if (collections[i] === 'notifications') {
            data = data.filter(function(n) { return n.status === 'pending'; });
        }
        el.textContent = data.length || 0;
    }
}

// ============================================
// INSTALL BUTTON LOGIC
// ============================================

var deferredPrompt;
var installBannerDismissed = localStorage.getItem('installBannerDismissed') === 'true';

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
    var installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'flex';
    }
    var banner = document.getElementById('installBanner');
    if (banner && !installBannerDismissed && !window.matchMedia('(display-mode: standalone)').matches) {
        banner.style.display = 'block';
    }
}

function hideInstallUI() {
    var installBtn = document.getElementById('installBtn');
    if (installBtn) {
        installBtn.style.display = 'none';
    }
    var banner = document.getElementById('installBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function dismissInstallBanner() {
    localStorage.setItem('installBannerDismissed', 'true');
    installBannerDismissed = true;
    var banner = document.getElementById('installBanner');
    if (banner) {
        banner.style.display = 'none';
    }
}

function checkIfInstalled() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        hideInstallUI();
        return true;
    }
    return false;
}

window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    console.log('App can be installed');
    if (!window.matchMedia('(display-mode: standalone)').matches) {
        showInstallUI();
    }
});

window.addEventListener('appinstalled', function() {
    console.log('App installed successfully');
    hideInstallUI();
    showToast('App installed successfully!', 'success');
});

// ============================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================

window.navigateTo = navigateTo;
window.toggleSidebar = toggleSidebar;
window.toggleTheme = toggleTheme;
window.logout = logout;
window.installApp = installApp;
window.dismissInstallBanner = dismissInstallBanner;
window.checkIfInstalled = checkIfInstalled;
window.showToast = showToast;
window.showNotification = showNotification;
window.generateReport = generateReport;
window.deleteMember = deleteMember;
window.deleteAttendance = deleteAttendance;
window.deleteGiving = deleteGiving;
window.editGiving = editGiving;
window.deleteEvent = deleteEvent;
window.editEvent = editEvent;
window.updateBadges = updateBadges;
window.updateSyncStatus = updateSyncStatus;
window.manualSync = manualSync;
window.updateOnlineUsers = updateOnlineUsers;

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    checkIfInstalled();

    var container = document.getElementById('pageContent');
    if (container) {
        renderDashboard(container);
    }

    updateBadges();

    if (typeof updateSidebarUser === 'function') {
        updateSidebarUser();
    }

    var darkSwitch = document.getElementById('darkModeSwitch');
    if (darkSwitch) {
        darkSwitch.checked = App.darkMode;
        darkSwitch.addEventListener('change', function() {
            toggleTheme();
        });
    }

    setTimeout(function() {
        showToast('Welcome to Victory Life CMS', 'success');
    }, 500);

    if (typeof Sync !== 'undefined' && Sync.init) {
        setTimeout(function() {
            Sync.init();
        }, 1000);
    }
});

// ============================================
// LOGOUT FUNCTION
// ============================================

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../auth/login.html';
    }
}
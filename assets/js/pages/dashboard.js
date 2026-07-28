// ============================================
// DASHBOARD PAGE
// ============================================

function renderDashboard(container) {
    // Get data
    const members = DB.getAll('members');
    const events = DB.getAll('events');
    const giving = DB.getAll('giving');
    const attendance = DB.getAll('attendance');

    // Stats
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'Active').length;
    const totalGiving = giving.reduce((sum, g) => sum + (parseFloat(g.amount) || 0), 0);
    const upcomingEvents = events.filter(e => e.status === 'Upcoming').length;

    // Update badges
    document.getElementById('memberBadge').textContent = totalMembers;
    document.getElementById('eventBadge').textContent = upcomingEvents;
    document.getElementById('financeBadge').textContent = giving.length;

    // Recent activity
    const recentGiving = giving.slice(0, 3);
    const recentMembers = members.slice(0, 3);

    container.innerHTML = `
        <!-- Stats Grid -->
        <section class="stats-grid">
            <div class="stat-card" onclick="navigateTo('members')">
                <div class="stat-top">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                </div>
                <div class="stat-value">${totalMembers}</div>
                <div class="stat-label">Total Members</div>
                <span class="stat-change positive">${activeMembers} active</span>
            </div>

            <div class="stat-card" onclick="navigateTo('events')">
                <div class="stat-top">
                    <div class="stat-icon"><i class="fas fa-calendar-alt"></i></div>
                </div>
                <div class="stat-value">${upcomingEvents}</div>
                <div class="stat-label">Upcoming Events</div>
                <span class="stat-change">Next: ${events.length > 0 ? events[0].title : 'None'}</span>
            </div>

            <div class="stat-card" onclick="navigateTo('finance')">
                <div class="stat-top">
                    <div class="stat-icon"><i class="fas fa-coins"></i></div>
                </div>
                <div class="stat-value">${formatCurrency(totalGiving)}</div>
                <div class="stat-label">Total Giving</div>
                <span class="stat-change positive">${giving.length} transactions</span>
            </div>

            <div class="stat-card" onclick="navigateTo('attendance')">
                <div class="stat-top">
                    <div class="stat-icon"><i class="fas fa-clipboard-check"></i></div>
                </div>
                <div class="stat-value">${attendance.length}</div>
                <div class="stat-label">Attendance Records</div>
                <span class="stat-change">${attendance.filter(a => a.status === 'Present').length} present</span>
            </div>
        </section>

        <!-- Dashboard Grid -->
        <section class="dashboard-grid">
            <!-- Recent Activity -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-clock"></i> Recent Activity</h3>
                    <button class="card-action" onclick="navigateTo('reports')">View All</button>
                </div>
                <div class="item-list">
                    ${recentGiving.length > 0 ? recentGiving.map(g => `
                        <div class="item">
                            <div class="item-icon"><i class="fas fa-hand-holding-heart"></i></div>
                            <div class="item-content">
                                <div class="item-title">${g.memberName} gave ${formatCurrency(g.amount)}</div>
                                <div class="item-meta">${formatDate(g.date)} · ${g.category}</div>
                            </div>
                            <span class="item-status active">${g.paymentMethod}</span>
                        </div>
                    `).join('') : '<div style="padding:16px;text-align:center;color:var(--text-muted);">No recent giving</div>'}

                    ${recentMembers.length > 0 ? recentMembers.map(m => `
                        <div class="item">
                            <div class="item-icon"><i class="fas fa-user-plus"></i></div>
                            <div class="item-content">
                                <div class="item-title">${m.firstName} ${m.lastName} joined</div>
                                <div class="item-meta">${formatDate(m.joinDate)}</div>
                            </div>
                            <span class="item-status ${m.status === 'Active' ? 'active' : 'pending'}">${m.status}</span>
                        </div>
                    `).join('') : ''}
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="card">
                <div class="card-header">
                    <h3><i class="fas fa-bolt"></i> Quick Actions</h3>
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button class="btn-primary" onclick="window.location.href='../members/add.html'" style="width:100%;justify-content:center;">
                        <i class="fas fa-user-plus"></i> Add New Member
                    </button>
                    <button class="btn-secondary" onclick="showToast('Feature coming soon', 'info')" style="width:100%;justify-content:center;">
                        <i class="fas fa-calendar-plus"></i> Create Event
                    </button>
                    <button class="btn-secondary" onclick="showToast('Feature coming soon', 'info')" style="width:100%;justify-content:center;">
                        <i class="fas fa-hand-holding-heart"></i> Record Giving
                    </button>
                    <button class="btn-secondary" onclick="showToast('Feature coming soon', 'info')" style="width:100%;justify-content:center;">
                        <i class="fas fa-file-export"></i> Generate Report
                    </button>
                </div>
            </div>
        </section>
    `;
}
// ============================================
// NOTIFICATIONS MODULE - Complete
// ============================================

const NotificationsModule = {
    // Push notification permission
    requestPermission() {
        if (!('Notification' in window)) {
            showToast('This browser does not support desktop notifications', 'warning');
            return;
        }

        if (Notification.permission === 'granted') {
            showToast('Notifications already enabled', 'success');
            return;
        }

        if (Notification.permission === 'denied') {
            showToast('Notifications are blocked. Please enable in browser settings.', 'error');
            return;
        }

        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                showToast('Notifications enabled!', 'success');
                // Send a test notification
                NotificationsModule.sendPushNotification('Victory Life CMS', 'Notifications are now enabled!');
            } else {
                showToast('Notifications denied', 'error');
            }
        });
    },

    // Send push notification
    sendPushNotification(title, body, icon) {
        if (!('Notification' in window)) {
            console.log('Push notifications not supported');
            return;
        }

        if (Notification.permission !== 'granted') {
            console.log('Notifications not granted');
            return;
        }

        try {
            const notification = new Notification(title, {
                body: body || '',
                icon: icon || '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/icon-72x72.png',
                vibrate: [200, 100, 200],
                tag: Date.now()
            });

            notification.onclick = function() {
                window.focus();
                notification.close();
            };

            // Log to history
            NotificationsModule.logNotification(title, body, 'push');
        } catch(e) {
            console.error('Push notification error:', e);
        }
    },

    // Log notification to history
    logNotification(title, message, type) {
        const notification = {
            type: type || 'email',
            subject: title,
            message: message,
            recipient: 'System',
            sentAt: new Date().toISOString(),
            status: 'sent',
            channel: type || 'system'
        };

        DB.add('notifications', notification);
    },

    // Send event reminder with push
    sendEventReminder(eventId) {
        const event = DB.get('events', eventId);
        if (!event) { showToast('Event not found', 'error'); return; }

        const daysUntil = Math.ceil((new Date(event.startDate) - new Date()) / (1000 * 60 * 60 * 24));

        // Send push notification
        const title = 'Event Reminder: ' + event.title;
        const body = 'Starts in ' + daysUntil + ' days at ' + (event.startTime || 'N/A');

        NotificationsModule.sendPushNotification(title, body);

        // Log to history
        NotificationsModule.logNotification(
            title,
            body + '\nVenue: ' + (event.venue || 'N/A'),
            'event_reminder'
        );

        // Update event
        const reminders = parseInt(event.reminders || 0) + 1;
        DB.update('events', eventId, { reminders: reminders });

        showToast('Reminder sent!', 'success');
    },

    // Send birthday notifications
    sendBirthdayNotifications() {
        const members = DB.getAll('members');
        const today = new Date();
        const todayStr = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

        let sent = 0;
        members.forEach(function(m) {
            if (m.dateOfBirth) {
                const dob = new Date(m.dateOfBirth);
                const dobStr = String(dob.getMonth() + 1).padStart(2, '0') + '-' + String(dob.getDate()).padStart(2, '0');
                if (dobStr === todayStr) {
                    const title = 'Happy Birthday!';
                    const body = 'Wishing ' + m.firstName + ' ' + m.lastName + ' a blessed birthday!';
                    NotificationsModule.sendPushNotification(title, body);
                    NotificationsModule.logNotification(
                        'Birthday: ' + m.firstName + ' ' + m.lastName,
                        'Happy birthday!',
                        'birthday'
                    );
                    sent++;
                }
            }
        });

        if (sent > 0) {
            showToast('Sent ' + sent + ' birthday notifications', 'success');
        } else {
            showToast('No birthdays today', 'info');
        }
    },

    // Render notification history
    renderHistory(container) {
        const notifications = DB.getAll('notifications').slice().reverse();
        const total = notifications.length;
        const pending = notifications.filter(function(n) { return n.status === 'pending'; }).length;

        let html = `
            <div class="notif-stats">
                <div class="notif-stat"><span class="notif-stat-value">${total}</span><span class="notif-stat-label">Total</span></div>
                <div class="notif-stat"><span class="notif-stat-value">${pending}</span><span class="notif-stat-label">Pending</span></div>
                <div class="notif-stat"><span class="notif-stat-value">${total - pending}</span><span class="notif-stat-label">Sent</span></div>
            </div>
            <div style="margin:16px 0;display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn-sm" onclick="NotificationsModule.clearHistory()">Clear History</button>
                <button class="btn-sm" onclick="NotificationsModule.sendTestNotification()">Send Test</button>
            </div>
            <div class="notif-list">
        `;

        if (notifications.length === 0) {
            html += '<div style="padding:40px;text-align:center;color:var(--text-muted);">No notifications sent yet</div>';
        } else {
            notifications.slice(0, 50).forEach(function(n) {
                const statusColor = n.status === 'sent' ? 'active' : n.status === 'pending' ? 'pending' : 'completed';
                const typeLabel = n.type ? n.type.replace('_', ' ').toUpperCase() : 'GENERAL';
                const channel = n.channel || 'email';

                html += `
                    <div class="notif-item">
                        <div class="notif-icon"><i class="fas fa-${channel === 'push' ? 'mobile-alt' : 'envelope'}"></i></div>
                        <div class="notif-content">
                            <div class="notif-title">${n.subject}</div>
                            <div class="notif-meta">${typeLabel} · ${formatDate(n.sentAt)} · To: ${n.recipient}</div>
                            <div class="notif-preview">${n.message ? n.message.substring(0, 100) + (n.message.length > 100 ? '...' : '') : ''}</div>
                        </div>
                        <span class="item-status ${statusColor}">${n.status}</span>
                    </div>
                `;
            });
        }

        html += `</div>`;
        container.innerHTML = html;
    },

    // Clear notification history
    clearHistory() {
        if (confirm('Clear all notification history?')) {
            DB.clear('notifications');
            showToast('History cleared', 'info');
            loadPageContent('notifications');
        }
    },

    // Send test notification
    sendTestNotification() {
        NotificationsModule.sendPushNotification('Test Notification', 'This is a test notification from Victory Life CMS');
        NotificationsModule.logNotification('Test Notification', 'Test message sent', 'test');
        showToast('Test notification sent!', 'success');
        loadPageContent('notifications');
    }
};
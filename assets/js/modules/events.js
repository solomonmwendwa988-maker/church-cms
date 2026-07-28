// ============================================
// EVENTS MODULE - Enhanced
// ============================================

const EventsModule = {
    // Event categories with colors
    categories: {
        'Conference': { color: '#2563eb', icon: 'fa-users' },
        'Service': { color: '#22c55e', icon: 'fa-church' },
        'Meeting': { color: '#f59e0b', icon: 'fa-handshake' },
        'Outreach': { color: '#ef4444', icon: 'fa-heart' },
        'Training': { color: '#8b5cf6', icon: 'fa-graduation-cap' },
        'Fellowship': { color: '#06b6d4', icon: 'fa-utensils' },
        'Youth': { color: '#ec4899', icon: 'fa-child' },
        'Prayer': { color: '#6366f1', icon: 'fa-pray' }
    },

    // Get category color
    getCategoryColor(category) {
        return this.categories[category]?.color || '#64748b';
    },

    // Get category icon
    getCategoryIcon(category) {
        return this.categories[category]?.icon || 'fa-calendar';
    },

    // Get events for a specific month
    getEventsForMonth(month, year) {
        const events = DB.getAll('events');
        return events.filter(function(e) {
            const date = new Date(e.startDate);
            return date.getMonth() === month && date.getFullYear() === year;
        });
    },

    // Get upcoming events (next 30 days)
    getUpcomingEvents(days) {
        days = days || 30;
        const events = DB.getAll('events');
        const now = new Date();
        const future = new Date(now);
        future.setDate(future.getDate() + days);
        return events.filter(function(e) {
            const date = new Date(e.startDate);
            return date >= now && date <= future && e.status !== 'Completed';
        }).sort(function(a, b) {
            return new Date(a.startDate) - new Date(b.startDate);
        });
    },

    // Send event reminder
    sendReminder(eventId) {
        const event = DB.get('events', eventId);
        if (!event) { showToast('Event not found', 'error'); return; }

        // Get all active members
        const members = DB.getAll('members').filter(function(m) { return m.status === 'Active'; });
        if (members.length === 0) {
            showToast('No active members to notify', 'warning');
            return;
        }

        // Create notification
        const notification = {
            type: 'event_reminder',
            subject: 'Reminder: ' + event.title,
            message: 'This is a reminder for the upcoming event:\n\n' +
                'Event: ' + event.title + '\n' +
                'Date: ' + formatDate(event.startDate) + '\n' +
                'Time: ' + (event.startTime || 'N/A') + '\n' +
                'Venue: ' + (event.venue || 'N/A') + '\n\n' +
                'We look forward to seeing you there!',
            recipient: members.length + ' members',
            sentAt: new Date().toISOString(),
            status: 'sent',
            eventId: eventId
        };

        DB.add('notifications', notification);

        // Update event reminder count
        const reminders = parseInt(event.reminders || 0) + 1;
        DB.update('events', eventId, { reminders: reminders });

        showToast('Reminder sent to ' + members.length + ' members', 'success');
        return notification;
    },

    // Render calendar view
    renderCalendar(container, month, year) {
        month = month || new Date().getMonth();
        year = year || new Date().getFullYear();

        const events = this.getEventsForMonth(month, year);
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

        let html = `
            <div class="calendar-header">
                <button class="btn-sm" onclick="EventsModule.changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
                <h3>${monthNames[month]} ${year}</h3>
                <button class="btn-sm" onclick="EventsModule.changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
                <button class="btn-sm" onclick="EventsModule.goToday()">Today</button>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekday">Sun</div>
                <div class="calendar-weekday">Mon</div>
                <div class="calendar-weekday">Tue</div>
                <div class="calendar-weekday">Wed</div>
                <div class="calendar-weekday">Thu</div>
                <div class="calendar-weekday">Fri</div>
                <div class="calendar-weekday">Sat</div>
        `;

        // Empty days before first day
        for (let i = 0; i < firstDay; i++) {
            html += `<div class="calendar-day empty"></div>`;
        }

        // Days of the month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
            const dayEvents = events.filter(function(e) {
                return e.startDate === dateStr;
            });

            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

            html += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="EventsModule.showDayEvents('${dateStr}')">`;
            html += `<span class="day-number">${day}</span>`;

            if (dayEvents.length > 0) {
                html += `<div class="day-events">`;
                dayEvents.slice(0, 3).forEach(function(e) {
                    const color = EventsModule.getCategoryColor(e.category);
                    html += `<div class="day-event-dot" style="background:${color};" title="${e.title}"></div>`;
                });
                if (dayEvents.length > 3) {
                    html += `<span class="day-event-more">+${dayEvents.length - 3}</span>`;
                }
                html += `</div>`;
            }

            html += `</div>`;
        }

        html += `</div>`;

        // Store current month/year for navigation
        window._calendarMonth = month;
        window._calendarYear = year;

        container.innerHTML = html;
    },

    // Change month
    changeMonth(delta) {
        const container = document.getElementById('calendarContainer');
        if (!container) return;
        let month = window._calendarMonth || new Date().getMonth();
        let year = window._calendarYear || new Date().getFullYear();
        month += delta;
        if (month > 11) { month = 0;
            year++; }
        if (month < 0) { month = 11;
            year--; }
        this.renderCalendar(container, month, year);
    },

    // Go to today
    goToday() {
        const container = document.getElementById('calendarContainer');
        if (!container) return;
        const now = new Date();
        this.renderCalendar(container, now.getMonth(), now.getFullYear());
    },

    // Show events for a specific day
    showDayEvents(dateStr) {
        const events = DB.getAll('events').filter(function(e) {
            return e.startDate === dateStr;
        });

        if (events.length === 0) {
            showToast('No events on this day', 'info');
            return;
        }

        let message = 'Events on ' + formatDate(dateStr) + ':\n\n';
        events.forEach(function(e, i) {
            message += (i + 1) + '. ' + e.title + '\n';
            message += '   Time: ' + (e.startTime || 'N/A') + '\n';
            message += '   Venue: ' + (e.venue || 'N/A') + '\n\n';
        });

        alert(message);
    },

    // Render event categories
    renderCategories(container) {
        let html = `<div class="event-categories">`;
        Object.entries(this.categories).forEach(function([name, data]) {
            html += `
                <div class="category-item" style="border-left-color:${data.color};">
                    <i class="fas ${data.icon}" style="color:${data.color};"></i>
                    <span>${name}</span>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }
};
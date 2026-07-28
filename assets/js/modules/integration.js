// ============================================
// INTEGRATION MODULE - Import/Export
// ============================================

const IntegrationModule = {
    // Export members to CSV
    exportMembersCSV() {
        const members = DB.getAll('members');
        if (members.length === 0) {
            showToast('No members to export', 'warning');
            return;
        }

        const headers = ['FirstName', 'LastName', 'Email', 'Phone', 'Address', 'JoinDate', 'Status', 'MembershipType'];
        const rows = members.map(function(m) {
            return [
                m.firstName || '',
                m.lastName || '',
                m.email || '',
                m.phone || '',
                m.address || '',
                m.joinDate || '',
                m.status || '',
                m.membershipType || ''
            ];
        });

        const csv = [headers.join(','), ...rows.map(function(r) { return r.join(','); })].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'members_export_' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);

        showToast('Exported ' + members.length + ' members', 'success');
    },

    // Export events to CSV
    exportEventsCSV() {
        const events = DB.getAll('events');
        if (events.length === 0) {
            showToast('No events to export', 'warning');
            return;
        }

        const headers = ['Title', 'Category', 'StartDate', 'EndDate', 'StartTime', 'EndTime', 'Venue', 'Capacity', 'Status'];
        const rows = events.map(function(e) {
            return [
                e.title || '',
                e.category || '',
                e.startDate || '',
                e.endDate || '',
                e.startTime || '',
                e.endTime || '',
                e.venue || '',
                e.capacity || '',
                e.status || ''
            ];
        });

        const csv = [headers.join(','), ...rows.map(function(r) { return r.join(','); })].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'events_export_' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);

        showToast('Exported ' + events.length + ' events', 'success');
    },

    // Export giving to CSV
    exportGivingCSV() {
        const giving = DB.getAll('giving');
        if (giving.length === 0) {
            showToast('No giving records to export', 'warning');
            return;
        }

        const headers = ['Member', 'Category', 'Amount', 'PaymentMethod', 'Date', 'Notes'];
        const rows = giving.map(function(g) {
            return [
                g.memberName || '',
                g.category || '',
                g.amount || '',
                g.paymentMethod || '',
                g.date || '',
                g.notes || ''
            ];
        });

        const csv = [headers.join(','), ...rows.map(function(r) { return r.join(','); })].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'giving_export_' + new Date().toISOString().split('T')[0] + '.csv';
        a.click();
        URL.revokeObjectURL(url);

        showToast('Exported ' + giving.length + ' giving records', 'success');
    },

    // Import members from CSV
    importMembersCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(function(line) { return line.trim(); });
                if (lines.length < 2) {
                    showToast('Invalid CSV format', 'error');
                    return;
                }

                const headers = lines[0].split(',').map(function(h) { return h.trim().toLowerCase(); });
                let imported = 0;
                let errors = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(function(v) { return v.trim(); });
                    const member = {};
                    headers.forEach(function(h, idx) {
                        if (idx < values.length) {
                            member[h] = values[idx];
                        }
                    });

                    if (member.firstname || member.lastname) {
                        const data = {
                            firstName: member.firstname || '',
                            lastName: member.lastname || '',
                            email: member.email || '',
                            phone: member.phone || '',
                            address: member.address || '',
                            joinDate: member.joindate || new Date().toISOString().split('T')[0],
                            status: member.status || 'Active',
                            membershipType: member.membershiptype || 'Full'
                        };
                        DB.add('members', data);
                        imported++;
                    } else {
                        errors++;
                    }
                }

                showToast('Imported ' + imported + ' members' + (errors > 0 ? ' (' + errors + ' errors)' : ''), 'success');
                loadPageContent('members');
                updateBadges();
            } catch(err) {
                showToast('Error importing: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    // Import events from CSV
    importEventsCSV(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(function(line) { return line.trim(); });
                if (lines.length < 2) {
                    showToast('Invalid CSV format', 'error');
                    return;
                }

                const headers = lines[0].split(',').map(function(h) { return h.trim().toLowerCase(); });
                let imported = 0;
                let errors = 0;

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',').map(function(v) { return v.trim(); });
                    const event = {};
                    headers.forEach(function(h, idx) {
                        if (idx < values.length) {
                            event[h] = values[idx];
                        }
                    });

                    if (event.title) {
                        const data = {
                            title: event.title || '',
                            description: event.description || '',
                            category: event.category || 'Service',
                            startDate: event.startdate || new Date().toISOString().split('T')[0],
                            endDate: event.enddate || event.startdate || new Date().toISOString().split('T')[0],
                            startTime: event.starttime || '',
                            endTime: event.endtime || '',
                            venue: event.venue || '',
                            capacity: parseInt(event.capacity) || 0,
                            status: event.status || 'Upcoming',
                            speaker: event.speaker || '',
                            registered: 0
                        };
                        DB.add('events', data);
                        imported++;
                    } else {
                        errors++;
                    }
                }

                showToast('Imported ' + imported + ' events' + (errors > 0 ? ' (' + errors + ' errors)' : ''), 'success');
                loadPageContent('events');
                updateBadges();
            } catch(err) {
                showToast('Error importing: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    // Full backup (JSON)
    exportFullBackup() {
        const data = {
            members: DB.getAll('members'),
            events: DB.getAll('events'),
            giving: DB.getAll('giving'),
            expenses: DB.getAll('expenses'),
            attendance: DB.getAll('attendance'),
            media: DB.getAll('media'),
            users: DB.getAll('users'),
            sermons: DB.getAll('sermons'),
            prayerRequests: DB.getAll('prayerRequests'),
            budgets: DB.getAll('budgets'),
            pledges: DB.getAll('pledges'),
            notifications: DB.getAll('notifications'),
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'full_backup_' + new Date().toISOString().split('T')[0] + '.json';
        a.click();
        URL.revokeObjectURL(url);

        showToast('Full backup exported successfully', 'success');
    },

    // Import full backup
    importFullBackup(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!confirm('This will overwrite ALL existing data. Are you sure?')) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                const collections = ['members', 'events', 'giving', 'expenses', 'attendance', 'media', 'users', 'sermons', 'prayerRequests', 'budgets', 'pledges', 'notifications'];

                collections.forEach(function(col) {
                    if (data[col]) {
                        DB.saveAll(col, data[col]);
                    }
                });

                showToast('Backup imported successfully', 'success');
                location.reload();
            } catch(err) {
                showToast('Error importing backup: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
};
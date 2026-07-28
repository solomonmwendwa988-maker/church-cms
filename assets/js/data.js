// ============================================
// DATA LAYER - localStorage Operations
// ============================================

const DB = {
    getAll(collection) {
        try {
            return JSON.parse(localStorage.getItem(collection)) || [];
        } catch { return []; }
    },
    saveAll(collection, data) {
        localStorage.setItem(collection, JSON.stringify(data));
    },
    add(collection, item) {
        const data = this.getAll(collection);
        item.id = collection + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        item.createdAt = new Date().toISOString();
        data.push(item);
        this.saveAll(collection, data);
        return item;
    },
    update(collection, id, updates) {
        const data = this.getAll(collection);
        const index = data.findIndex(item => item.id === id);
        if (index === -1) return null;
        data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
        this.saveAll(collection, data);
        return data[index];
    },
    delete(collection, id) {
        const data = this.getAll(collection);
        const filtered = data.filter(item => item.id !== id);
        this.saveAll(collection, filtered);
        return filtered;
    },
    get(collection, id) {
        const data = this.getAll(collection);
        return data.find(item => item.id === id) || null;
    },
    search(collection, term, fields) {
        const data = this.getAll(collection);
        if (!term) return data;
        const lower = term.toLowerCase();
        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && value.toString().toLowerCase().includes(lower);
            });
        });
    },
    clear(collection) {
        this.saveAll(collection, []);
    },
    sum(collection, field, filter) {
        const data = this.getAll(collection);
        const filtered = filter ? data.filter(filter) : data;
        return filtered.reduce((sum, item) => sum + (parseFloat(item[field]) || 0), 0);
    }
};

// ============================================
// SEED SAMPLE DATA
// ============================================

function seedData() {
    // Users - Default admin
    if (DB.getAll('users').length === 0) {
        const users = [
            { name: 'Admin User', email: 'admin@church.com', password: 'password123', role: 'admin', status: 'active', avatar: 'AU' },
            { name: 'Pastor John', email: 'pastor@church.com', password: 'pastor123', role: 'pastor', status: 'active', avatar: 'PJ' },
            { name: 'Secretary Mary', email: 'secretary@church.com', password: 'secretary123', role: 'secretary', status: 'active', avatar: 'SM' }
        ];
        users.forEach(u => DB.add('users', u));
    }

    // Members
    if (DB.getAll('members').length === 0) {
        const members = [
            { firstName: 'John', lastName: 'Mwangi', email: 'john@email.com', phone: '0712345678', address: '123 Nairobi', joinDate: '2024-01-15', status: 'Active', membershipType: 'Full' },
            { firstName: 'Mary', lastName: 'Wanjiru', email: 'mary@email.com', phone: '0723456789', address: '456 Kiambu', joinDate: '2024-02-20', status: 'Active', membershipType: 'Full' }
        ];
        members.forEach(m => DB.add('members', m));
    }

    // Events
    if (DB.getAll('events').length === 0) {
        const events = [
            { title: 'Youth Conference 2026', description: 'Annual youth conference', category: 'Conference', startDate: '2026-07-25', endDate: '2026-07-27', startTime: '09:00', endTime: '17:00', venue: 'Nairobi Convention Centre', capacity: 500, registered: 0, status: 'Upcoming', speaker: 'Pastor John Doe' },
            { title: 'Prayer Night', description: 'Weekly prayer meeting', category: 'Service', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], startTime: '19:00', endTime: '21:00', venue: 'Church Auditorium', capacity: 200, registered: 0, status: 'Ongoing', speaker: 'Pastor James' }
        ];
        events.forEach(e => DB.add('events', e));
    }

    // Giving
    if (DB.getAll('giving').length === 0) {
        const members = DB.getAll('members');
        const giving = [
            { memberId: members[0]?.id || '', memberName: members[0] ? members[0].firstName + ' ' + members[0].lastName : 'John Mwangi', amount: 5000, category: 'Tithe', paymentMethod: 'Cash', date: '2024-07-15', receiptNumber: 'RCP-2024-001', notes: 'Sunday service' }
        ];
        giving.forEach(g => DB.add('giving', g));
    }

    // Sermons
    if (DB.getAll('sermons').length === 0) {
        const sermons = [
            { title: 'Walking in Faith', series: 'Book of Hebrews', preacher: 'Pastor John', date: '2024-07-21', description: 'Understanding faith through the book of Hebrews', scripture: 'Hebrews 11:1', notes: 'Faith is the substance of things hoped for...', audioUrl: '', duration: '45:00', status: 'published' }
        ];
        sermons.forEach(s => DB.add('sermons', s));
    }

    // Prayer Requests
    if (DB.getAll('prayerRequests').length === 0) {
        const requests = [
            { memberName: 'John Mwangi', title: 'Healing for my mother', description: 'My mother is in the hospital. Please pray for her healing.', status: 'active', assignedTo: ['Pastor John'], answeredDate: '', createdAt: new Date().toISOString() }
        ];
        requests.forEach(r => DB.add('prayerRequests', r));
    }

    // Budgets
    if (DB.getAll('budgets').length === 0) {
        const budgets = [
            { category: 'Church Operations', allocated: 50000, spent: 32000, period: '2024-07', notes: 'Monthly operations budget' }
        ];
        budgets.forEach(b => DB.add('budgets', b));
    }

    // Pledges
    if (DB.getAll('pledges').length === 0) {
        const members = DB.getAll('members');
        const pledges = [
            { memberId: members[0]?.id || '', memberName: members[0] ? members[0].firstName + ' ' + members[0].lastName : 'John Mwangi', amount: 10000, category: 'Building Fund', startDate: '2024-01-01', endDate: '2024-12-31', paid: 3000, balance: 7000, status: 'active', notes: 'Monthly pledge' }
        ];
        pledges.forEach(p => DB.add('pledges', p));
    }

    // Notifications
    if (DB.getAll('notifications').length === 0) {
        const notifications = [
            { type: 'email', subject: 'Welcome to Victory Life CMS', message: 'Welcome to the church management system.', recipient: 'admin@church.com', sentAt: new Date().toISOString(), status: 'sent' }
        ];
        notifications.forEach(n => DB.add('notifications', n));
    }
}

// Add to seedData() function
if (DB.getAll('mpesaTransactions').length === 0) {
    const transactions = [
        {
            transactionId: 'MPESA-001-ABC123',
            phone: '254712345678',
            amount: 5000,
            type: 'tithe',
            description: 'Sunday tithe payment',
            status: 'completed',
            resultCode: '0',
            resultDesc: 'Success. Payment received.',
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
        },
        {
            transactionId: 'MPESA-002-DEF456',
            phone: '254723456789',
            amount: 2000,
            type: 'offering',
            description: 'Sunday offering',
            status: 'completed',
            resultCode: '0',
            resultDesc: 'Success. Payment received.',
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 5 * 86400000).toISOString()
        },
        {
            transactionId: 'MPESA-003-GHI789',
            phone: '254734567890',
            amount: 10000,
            type: 'building',
            description: 'Building fund contribution',
            status: 'pending',
            resultCode: null,
            resultDesc: null,
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
        }
    ];
    transactions.forEach(function(t) {
        const id = 'mp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        DB.add('mpesaTransactions', { ...t, id: id });
    });
}
seedData();

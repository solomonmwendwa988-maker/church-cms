// ============================================
// SYNC MANAGEMENT - Real-time Multi-User
// ============================================

const Sync = {
    apiUrl: 'https://church-cms-api-11h5.onrender.com/api',
    socket: null,
    isConnected: false,
    onlineUsers: [],
    syncInterval: null,

    init() {
        console.log('🔄 Sync initialized');
        this.connectSocket();
        this.loadDataFromServer();
        this.startAutoSync();
    },

    connectSocket() {
        if (this.socket) return;

        this.socket = io('https://church-cms-api-11h5.onrender.com', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => {
            console.log('🔗 WebSocket connected');
            this.isConnected = true;
            
            const user = getCurrentUser();
            if (user) {
                this.socket.emit('user_online', {
                    userId: user.id,
                    name: user.name,
                    role: user.role
                });
                this.socket.emit('join', user.id);
                if (user.role === 'admin') {
                    this.socket.emit('join_admin');
                }
            }
            
            showToast('🟢 Connected to server', 'success');
        });

        this.socket.on('disconnect', () => {
            this.isConnected = false;
            showToast('🔴 Disconnected from server', 'warning');
        });

        // Online users
        this.socket.on('users_online', (users) => {
            this.onlineUsers = users;
            this.updateOnlineUsers();
        });

        // Real-time CRUD events
        this.socket.on('member_created', (data) => {
            this.handleRealtimeUpdate('member_created', data);
        });
        this.socket.on('member_updated', (data) => {
            this.handleRealtimeUpdate('member_updated', data);
        });
        this.socket.on('member_deleted', (data) => {
            this.handleRealtimeUpdate('member_deleted', data);
        });

        this.socket.on('event_created', (data) => {
            this.handleRealtimeUpdate('event_created', data);
        });
        this.socket.on('event_updated', (data) => {
            this.handleRealtimeUpdate('event_updated', data);
        });
        this.socket.on('event_deleted', (data) => {
            this.handleRealtimeUpdate('event_deleted', data);
        });

        this.socket.on('giving_created', (data) => {
            this.handleRealtimeUpdate('giving_created', data);
        });

        this.socket.on('mpesa_transaction', (data) => {
            this.handleRealtimeUpdate('mpesa_transaction', data);
        });

        this.socket.on('sermon_created', (data) => {
            this.handleRealtimeUpdate('sermon_created', data);
        });

        this.socket.on('sync_completed', (data) => {
            showToast('🔄 Data synced with server', 'success');
        });
    },

    handleRealtimeUpdate(event, data) {
        console.log('📢 Real-time:', event, data);
        
        // Show notification
        const messages = {
            member_created: `👤 New member added: ${data.first_name} ${data.last_name}`,
            member_updated: `👤 Member updated: ${data.first_name} ${data.last_name}`,
            member_deleted: '👤 Member deleted',
            event_created: `📅 New event: ${data.title}`,
            event_updated: `📅 Event updated: ${data.title}`,
            event_deleted: '📅 Event deleted',
            giving_created: `💰 Giving recorded: ${data.member_name}`,
            mpesa_transaction: `📱 M-Pesa payment: ${formatCurrency(data.amount)}`,
            sermon_created: `📖 New sermon: ${data.title}`
        };
        
        if (messages[event]) {
            showToast(messages[event], 'info');
        }

        // Update local data
        const collections = {
            member_created: 'members',
            member_updated: 'members',
            member_deleted: 'members',
            event_created: 'events',
            event_updated: 'events',
            event_deleted: 'events',
            giving_created: 'giving',
            mpesa_transaction: 'mpesaTransactions',
            sermon_created: 'sermons'
        };

        const collection = collections[event];
        if (collection) {
            if (event.endsWith('_deleted')) {
                DB.delete(collection, data.id);
            } else if (event.endsWith('_updated')) {
                DB.update(collection, data.id, data);
            } else {
                DB.add(collection, data);
            }
        }

        // Refresh UI
        if (typeof updateBadges === 'function') updateBadges();
        if (typeof renderAll === 'function') renderAll();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderMembers === 'function') renderMembers();
        if (typeof renderEvents === 'function') renderEvents();
        if (typeof renderFinance === 'function') renderFinance();
    },

    updateOnlineUsers() {
        const container = document.getElementById('onlineUsers');
        if (!container) return;

        const count = this.onlineUsers.length;
        const names = this.onlineUsers.map(u => u.name).join(', ');

        container.innerHTML = `
            <div style="display:flex;align-items:center;gap:8px;font-size:0.85rem;">
                <span style="color:var(--success);">●</span>
                <span>${count} online</span>
                ${names ? `<span style="color:var(--text-secondary);font-size:0.75rem;">(${names})</span>` : ''}
            </div>
        `;
    },

    async loadDataFromServer() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const collections = ['members', 'events', 'giving', 'sermons', 'mpesa', 'users', 'notifications', 'pledges', 'budgets', 'prayer-requests'];

            for (const col of collections) {
                try {
                    const response = await fetch(`${this.apiUrl}/${col}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.length > 0) {
                            const collectionName = col === 'mpesa' ? 'mpesaTransactions' : col.replace('-', '');
                            DB.saveAll(collectionName, data);
                            console.log(`✅ Loaded ${data.length} ${col} from server`);
                        }
                    }
                } catch (e) {
                    console.log(`⚠️ Could not load ${col}:`, e.message);
                }
            }

            if (typeof updateBadges === 'function') updateBadges();
            if (typeof renderAll === 'function') renderAll();

        } catch (error) {
            console.log('⚠️ Sync error:', error.message);
        }
    },

    async syncData() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const data = {
                members: DB.getAll('members'),
                events: DB.getAll('events'),
                giving: DB.getAll('giving'),
                mpesaTransactions: DB.getAll('mpesaTransactions'),
                sermons: DB.getAll('sermons')
            };

            const response = await fetch(`${this.apiUrl}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ data })
            });

            if (response.ok) {
                console.log('✅ Data synced to server');
            }
        } catch (error) {
            console.log('⚠️ Sync error:', error.message);
        }
    },

    startAutoSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 30000);
    },

    async manualSync() {
        showToast('🔄 Syncing...', 'info');
        await this.syncData();
        await this.loadDataFromServer();
        showToast('✅ Sync completed', 'success');
    },

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
    }
};
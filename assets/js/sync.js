// ============================================
// SYNC MANAGEMENT - Real-time Multi-User
// ============================================

var Sync = {
    apiUrl: 'https://church-cms-api-11h5.onrender.com/api',
    socket: null,
    isConnected: false,
    onlineUsers: [],
    syncInterval: null,

    init: function() {
        console.log('Sync initialized');
        this.connectSocket();
        this.loadDataFromServer();
        this.startAutoSync();
    },

    connectSocket: function() {
        if (this.socket) return;

        this.socket = io('https://church-cms-api-11h5.onrender.com', {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', function() {
            console.log('WebSocket connected');
            this.isConnected = true;

            var user = getCurrentUser();
            if (user) {
                this.socket.emit('user_online', {
                    userId: user.id,
                    name: user.name,
                    role: user.role
                });
                this.socket.emit('join', user.id);
            }

            if (typeof updateSyncStatus === 'function') {
                updateSyncStatus('synced');
            }
            showToast('Connected to server', 'success');
        }.bind(this));

        this.socket.on('disconnect', function() {
            this.isConnected = false;
            if (typeof updateSyncStatus === 'function') {
                updateSyncStatus('error');
            }
            showToast('Disconnected from server', 'warning');
        }.bind(this));

        this.socket.on('users_online', function(users) {
            this.onlineUsers = users;
            if (typeof updateOnlineUsers === 'function') {
                updateOnlineUsers(users);
            }
        }.bind(this));

        this.socket.on('member_created', function(data) {
            this.handleRealtimeUpdate('member_created', data);
        }.bind(this));

        this.socket.on('member_updated', function(data) {
            this.handleRealtimeUpdate('member_updated', data);
        }.bind(this));

        this.socket.on('member_deleted', function(data) {
            this.handleRealtimeUpdate('member_deleted', data);
        }.bind(this));

        this.socket.on('event_created', function(data) {
            this.handleRealtimeUpdate('event_created', data);
        }.bind(this));

        this.socket.on('event_updated', function(data) {
            this.handleRealtimeUpdate('event_updated', data);
        }.bind(this));

        this.socket.on('event_deleted', function(data) {
            this.handleRealtimeUpdate('event_deleted', data);
        }.bind(this));

        this.socket.on('giving_created', function(data) {
            this.handleRealtimeUpdate('giving_created', data);
        }.bind(this));

        this.socket.on('mpesa_transaction', function(data) {
            this.handleRealtimeUpdate('mpesa_transaction', data);
        }.bind(this));

        this.socket.on('sermon_created', function(data) {
            this.handleRealtimeUpdate('sermon_created', data);
        }.bind(this));

        this.socket.on('user_updated', function(data) {
            this.handleRealtimeUpdate('user_updated', data);
        }.bind(this));

        this.socket.on('user_deleted', function(data) {
            this.handleRealtimeUpdate('user_deleted', data);
        }.bind(this));

        this.socket.on('sync_completed', function() {
            if (typeof updateSyncStatus === 'function') {
                updateSyncStatus('synced');
            }
            showToast('Data synced with server', 'success');
        }.bind(this));
    },

    handleRealtimeUpdate: function(event, data) {
        console.log('Real-time event:', event, data);

        var messages = {
            'member_created': 'New member added: ' + (data.first_name || '') + ' ' + (data.last_name || ''),
            'member_updated': 'Member updated: ' + (data.first_name || '') + ' ' + (data.last_name || ''),
            'member_deleted': 'Member deleted',
            'event_created': 'New event: ' + (data.title || ''),
            'event_updated': 'Event updated: ' + (data.title || ''),
            'event_deleted': 'Event deleted',
            'giving_created': 'Giving recorded: ' + (data.member_name || ''),
            'mpesa_transaction': 'M-Pesa payment: ' + formatCurrency(data.amount || 0),
            'sermon_created': 'New sermon: ' + (data.title || ''),
            'user_updated': 'User updated: ' + (data.name || ''),
            'user_deleted': 'User deleted'
        };

        if (messages[event]) {
            showToast(messages[event], 'info');
        }

        var collections = {
            'member_created': 'members',
            'member_updated': 'members',
            'member_deleted': 'members',
            'event_created': 'events',
            'event_updated': 'events',
            'event_deleted': 'events',
            'giving_created': 'giving',
            'mpesa_transaction': 'mpesaTransactions',
            'sermon_created': 'sermons',
            'user_updated': 'users',
            'user_deleted': 'users'
        };

        var collection = collections[event];
        if (collection) {
            if (event.indexOf('deleted') !== -1) {
                DB.delete(collection, data.id);
            } else if (event.indexOf('updated') !== -1) {
                DB.update(collection, data.id, data);
            } else {
                DB.add(collection, data);
            }
        }

        if (typeof updateBadges === 'function') updateBadges();
        if (typeof renderAll === 'function') renderAll();
    },

    loadDataFromServer: function() {
        var token = localStorage.getItem('token');
        if (!token) return;

        var collections = ['members', 'events', 'giving', 'sermons', 'mpesa', 'users', 'notifications', 'pledges', 'budgets', 'prayer-requests'];

        for (var i = 0; i < collections.length; i++) {
            (function(col) {
                fetch(Sync.apiUrl + '/' + col, {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                .then(function(response) {
                    if (response.ok) {
                        return response.json();
                    }
                    return null;
                })
                .then(function(data) {
                    if (data && data.length > 0) {
                        var collectionName = col === 'mpesa' ? 'mpesaTransactions' : col.replace('-', '');
                        DB.saveAll(collectionName, data);
                        console.log('Loaded ' + data.length + ' ' + col + ' from server');
                    }
                })
                .catch(function(err) {
                    console.log('Could not load ' + col + ':', err.message);
                });
            })(collections[i]);
        }

        setTimeout(function() {
            if (typeof updateBadges === 'function') updateBadges();
            if (typeof renderAll === 'function') renderAll();
            if (typeof updateSyncStatus === 'function') updateSyncStatus('synced');
        }, 2000);
    },

    syncData: function() {
        var token = localStorage.getItem('token');
        if (!token) return;

        var data = {
            members: DB.getAll('members'),
            events: DB.getAll('events'),
            giving: DB.getAll('giving'),
            mpesaTransactions: DB.getAll('mpesaTransactions'),
            sermons: DB.getAll('sermons')
        };

        fetch(this.apiUrl + '/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ data: data })
        })
        .then(function(response) {
            if (response.ok) {
                console.log('Data synced to server');
            }
        })
        .catch(function(error) {
            console.log('Sync error:', error.message);
            if (typeof updateSyncStatus === 'function') {
                updateSyncStatus('error');
            }
        });
    },

    startAutoSync: function() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(function() {
            if (this.isConnected) {
                this.syncData();
            }
        }.bind(this), 30000);
    },

    manualSync: function() {
        if (typeof updateSyncStatus === 'function') {
            updateSyncStatus('syncing');
        }
        showToast('Syncing...', 'info');
        this.syncData();
        this.loadDataFromServer();
        setTimeout(function() {
            if (typeof updateSyncStatus === 'function') {
                updateSyncStatus('synced');
            }
            showToast('Sync completed', 'success');
        }, 3000);
    },

    disconnect: function() {
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
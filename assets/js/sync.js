// ============================================
// SYNC - Connect Frontend to Backend
// ============================================

const Sync = {
    apiUrl: 'https://church-cms-api-11h5.onrender.com/api',
    socket: null,
    isConnected: false,
    syncInterval: null,

    // Initialize
    init() {
        console.log('🔄 Sync initialized');
        this.loadDataFromServer();
        this.startAutoSync();
    },

    // Load data from server
    async loadDataFromServer() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const collections = ['members', 'events', 'giving', 'sermons', 'mpesa', 'users', 'notifications'];

            for (const col of collections) {
                try {
                    const response = await fetch(`${this.apiUrl}/${col}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data && data.length > 0) {
                            const collectionName = col === 'mpesa' ? 'mpesaTransactions' : col;
                            DB.saveAll(collectionName, data);
                            console.log(`✅ Loaded ${data.length} ${col} from server`);
                        }
                    }
                } catch (e) {
                    console.log(`⚠️ Could not load ${col}:`, e.message);
                }
            }

            // Update UI
            if (typeof updateBadges === 'function') updateBadges();
            if (typeof renderAll === 'function') renderAll();

        } catch (error) {
            console.log('⚠️ Sync error:', error.message);
        }
    },

    // Sync data to server
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

    // Start auto sync
    startAutoSync() {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            this.syncData();
        }, 30000); // Sync every 30 seconds
    },

    // Manual sync
    async manualSync() {
        showToast('🔄 Syncing...', 'info');
        await this.syncData();
        await this.loadDataFromServer();
        showToast('✅ Sync completed', 'success');
    }
};
// ============================================
// M-PESA INTEGRATION MODULE
// Complete transaction system with simulation
// ============================================

const Mpesa = {
    // ============================================
    // CONFIGURATION
    // ============================================
    config: {
        businessShortcode: '174379',
        passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        consumerKey: 'nZ0bY8QxP4e2K0WX9Y3o7V1uC',
        consumerSecret: '8xP2dF1qK5wV9aZ7eN0cL3sG6tR4hY8mU2oB5jX7wE1'
    },

    // ============================================
    // TRANSACTION TYPES
    // ============================================
    transactionTypes: [
        { id: 'tithe', name: 'Tithe', icon: 'fa-hand-holding-heart' },
        { id: 'offering', name: 'Offering', icon: 'fa-hand-holding-usd' },
        { id: 'pledge', name: 'Pledge Payment', icon: 'fa-handshake' },
        { id: 'event', name: 'Event Registration', icon: 'fa-ticket-alt' },
        { id: 'building', name: 'Building Fund', icon: 'fa-building' },
        { id: 'missions', name: 'Missions', icon: 'fa-globe-africa' },
        { id: 'benevolence', name: 'Benevolence', icon: 'fa-hands-helping' },
        { id: 'general', name: 'General', icon: 'fa-donate' }
    ],

    // ============================================
    // TRANSACTION STATUS
    // ============================================
    statuses: {
        pending: { label: 'Pending', color: '#f59e0b', icon: 'fa-clock' },
        processing: { label: 'Processing', color: '#3b82f6', icon: 'fa-spinner' },
        completed: { label: 'Completed', color: '#22c55e', icon: 'fa-check-circle' },
        failed: { label: 'Failed', color: '#ef4444', icon: 'fa-times-circle' },
        cancelled: { label: 'Cancelled', color: '#94a3b8', icon: 'fa-ban' }
    },

    // ============================================
    // GET ALL TRANSACTIONS
    // ============================================
    getTransactions() {
        return DB.getAll('mpesaTransactions');
    },

    // ============================================
    // GET TRANSACTION BY ID
    // ============================================
    getTransaction(id) {
        return DB.get('mpesaTransactions', id);
    },

    // ============================================
    // GET TRANSACTIONS BY DATE RANGE
    // ============================================
    getTransactionsByDate(startDate, endDate) {
        const transactions = this.getTransactions();
        return transactions.filter(function(t) {
            const date = new Date(t.createdAt);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
    },

    // ============================================
    // GET TRANSACTIONS BY TYPE
    // ============================================
    getTransactionsByType(type) {
        const transactions = this.getTransactions();
        return transactions.filter(function(t) { return t.type === type; });
    },

    // ============================================
    // GET TRANSACTIONS BY STATUS
    // ============================================
    getTransactionsByStatus(status) {
        const transactions = this.getTransactions();
        return transactions.filter(function(t) { return t.status === status; });
    },

    // ============================================
    // GET TRANSACTION SUMMARY
    // ============================================
    getSummary() {
        const transactions = this.getTransactions();
        const total = transactions.length;
        const completed = transactions.filter(function(t) { return t.status === 'completed'; }).length;
        const pending = transactions.filter(function(t) { return t.status === 'pending'; }).length;
        const failed = transactions.filter(function(t) { return t.status === 'failed'; }).length;
        const totalAmount = transactions.reduce(function(sum, t) {
            return sum + (t.status === 'completed' ? parseFloat(t.amount || 0) : 0);
        }, 0);

        const today = new Date().toISOString().split('T')[0];
        const todayTransactions = transactions.filter(function(t) {
            return t.createdAt && t.createdAt.split('T')[0] === today;
        });
        const todayAmount = todayTransactions.reduce(function(sum, t) {
            return sum + (t.status === 'completed' ? parseFloat(t.amount || 0) : 0);
        }, 0);

        return {
            total: total,
            completed: completed,
            pending: pending,
            failed: failed,
            totalAmount: totalAmount,
            todayCount: todayTransactions.length,
            todayAmount: todayAmount,
            successRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    },

    // ============================================
    // GET TRANSACTION BY PHONE
    // ============================================
    getTransactionsByPhone(phone) {
        const transactions = this.getTransactions();
        return transactions.filter(function(t) { return t.phone === phone; });
    },

    // ============================================
    // SIMULATE STK PUSH (Complete Flow)
    // ============================================
    stkPush(phone, amount, type, description) {
        return new Promise(function(resolve, reject) {
            // Validate phone number
            const cleanedPhone = phone.replace(/\D/g, '');
            if (cleanedPhone.length < 10 || cleanedPhone.length > 12) {
                reject({ message: 'Invalid phone number. Please enter a valid Safaricom number.' });
                return;
            }

            if (amount <= 0) {
                reject({ message: 'Amount must be greater than 0' });
                return;
            }

            // Format phone (add 254 if starts with 0)
            let formattedPhone = cleanedPhone;
            if (formattedPhone.startsWith('0')) {
                formattedPhone = '254' + formattedPhone.substring(1);
            } else if (!formattedPhone.startsWith('254')) {
                formattedPhone = '254' + formattedPhone;
            }

            // Generate transaction ID
            const transactionId = 'MPESA-' + Date.now().toString().slice(-6) + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

            // Create transaction record
            const transaction = {
                id: 'mp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                transactionId: transactionId,
                phone: formattedPhone,
                amount: amount,
                type: type || 'general',
                description: description || '',
                status: 'pending',
                merchantRequestId: 'MRID-' + Date.now().toString().slice(-8),
                checkoutRequestId: 'CRID-' + Date.now().toString().slice(-8),
                resultCode: null,
                resultDesc: null,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            DB.add('mpesaTransactions', transaction);

            // Simulate STK Push flow
            const steps = [
                { status: 'Sending STK Push to ' + formattedPhone, delay: 1000 },
                { status: 'Customer prompted to enter PIN', delay: 2000 },
                { status: 'Processing payment of KES ' + amount.toFixed(2), delay: 1500 },
                { status: 'Transaction completed successfully', delay: 1000 }
            ];

            let currentStep = 0;
            const totalSteps = steps.length;

            function processStep() {
                if (currentStep >= totalSteps) {
                    // Update transaction to completed
                    const updatedTransaction = DB.get('mpesaTransactions', transaction.id);
                    if (updatedTransaction) {
                        DB.update('mpesaTransactions', transaction.id, {
                            status: 'completed',
                            resultCode: '0',
                            resultDesc: 'Success. Payment received.',
                            updatedAt: new Date().toISOString()
                        });
                    }

                    // If this is a giving transaction, also record in giving
                    if (type === 'tithe' || type === 'offering' || type === 'pledge') {
                        const members = DB.getAll('members');
                        const givingData = {
                            memberId: members.length > 0 ? members[0].id : '',
                            memberName: 'M-Pesa Donor',
                            amount: amount,
                            category: type === 'tithe' ? 'Tithe' : (type === 'offering' ? 'Offering' : 'Pledge Payment'),
                            paymentMethod: 'M-Pesa',
                            date: new Date().toISOString().split('T')[0],
                            receiptNumber: 'RCP-' + Date.now().toString().slice(-6),
                            notes: 'M-Pesa payment: ' + transactionId + ' - ' + description,
                            transactionId: transactionId,
                            mpesaTransactionId: transaction.id
                        };
                        DB.add('giving', givingData);
                    }

                    resolve({
                        success: true,
                        transaction: updatedTransaction || transaction,
                        message: 'Payment of KES ' + amount.toFixed(2) + ' successful!'
                    });
                    return;
                }

                const step = steps[currentStep];
                currentStep++;

                setTimeout(function() {
                    processStep();
                }, step.delay);
            }

            // Start the simulation
            setTimeout(function() {
                processStep();
            }, 500);
        });
    },

    // ============================================
    // PROCESS MPESA PAYMENT (Wrapper)
    // ============================================
    processPayment(phone, amount, type, description) {
        return this.stkPush(phone, amount, type, description);
    },

    // ============================================
    // CHECK TRANSACTION STATUS
    // ============================================
    checkStatus(transactionId) {
        const transaction = this.getTransaction(transactionId);
        if (!transaction) {
            return { status: 'not_found', message: 'Transaction not found' };
        }

        const statusInfo = this.statuses[transaction.status] || this.statuses.pending;

        return {
            id: transaction.id,
            transactionId: transaction.transactionId,
            status: transaction.status,
            statusLabel: statusInfo.label,
            statusColor: statusInfo.color,
            phone: transaction.phone,
            amount: transaction.amount,
            type: transaction.type,
            description: transaction.description,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            resultCode: transaction.resultCode,
            resultDesc: transaction.resultDesc
        };
    },

    // ============================================
    // CANCEL TRANSACTION
    // ============================================
    cancelTransaction(transactionId) {
        const transaction = this.getTransaction(transactionId);
        if (!transaction) {
            return { success: false, message: 'Transaction not found' };
        }

        if (transaction.status !== 'pending') {
            return { success: false, message: 'Only pending transactions can be cancelled' };
        }

        DB.update('mpesaTransactions', transactionId, {
            status: 'cancelled',
            resultDesc: 'Cancelled by user',
            updatedAt: new Date().toISOString()
        });

        return { success: true, message: 'Transaction cancelled' };
    },

    // ============================================
    // GENERATE RECEIPT
    // ============================================
    generateReceipt(transactionId) {
        const transaction = this.getTransaction(transactionId);
        if (!transaction) {
            return null;
        }

        const receipt = {
            receiptNumber: 'RCP-' + Date.now().toString().slice(-6),
            transactionId: transaction.transactionId,
            amount: transaction.amount,
            phone: transaction.phone,
            type: transaction.type,
            description: transaction.description,
            date: new Date(transaction.createdAt).toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            status: transaction.status,
            resultDesc: transaction.resultDesc || 'Payment successful'
        };

        return receipt;
    },

    // ============================================
    // GET DAILY SUMMARY
    // ============================================
    getDailySummary(date) {
        date = date || new Date().toISOString().split('T')[0];
        const transactions = this.getTransactionsByDate(date, date);

        const summary = {
            date: date,
            total: transactions.length,
            completed: transactions.filter(function(t) { return t.status === 'completed'; }).length,
            pending: transactions.filter(function(t) { return t.status === 'pending'; }).length,
            failed: transactions.filter(function(t) { return t.status === 'failed'; }).length,
            totalAmount: transactions.reduce(function(sum, t) {
                return sum + (t.status === 'completed' ? parseFloat(t.amount || 0) : 0);
            }, 0),
            byType: {}
        };

        transactions.forEach(function(t) {
            if (!summary.byType[t.type]) {
                summary.byType[t.type] = { count: 0, amount: 0 };
            }
            summary.byType[t.type].count++;
            if (t.status === 'completed') {
                summary.byType[t.type].amount += parseFloat(t.amount || 0);
            }
        });

        return summary;
    },

    // ============================================
    // GET WEEKLY SUMMARY
    // ============================================
    getWeeklySummary() {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - 6);
        startOfWeek.setHours(0, 0, 0, 0);

        const transactions = this.getTransactions().filter(function(t) {
            return new Date(t.createdAt) >= startOfWeek;
        });

        const dailyData = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            dailyData[dateStr] = { date: dateStr, count: 0, amount: 0 };
        }

        transactions.forEach(function(t) {
            const dateStr = t.createdAt.split('T')[0];
            if (dailyData[dateStr]) {
                dailyData[dateStr].count++;
                if (t.status === 'completed') {
                    dailyData[dateStr].amount += parseFloat(t.amount || 0);
                }
            }
        });

        return Object.values(dailyData);
    },

    // ============================================
    // GET MONTHLY SUMMARY
    // ============================================
    getMonthlySummary(month, year) {
        month = month || new Date().getMonth();
        year = year || new Date().getFullYear();

        const transactions = this.getTransactions().filter(function(t) {
            const date = new Date(t.createdAt);
            return date.getMonth() === month && date.getFullYear() === year;
        });

        return {
            month: month,
            year: year,
            total: transactions.length,
            completed: transactions.filter(function(t) { return t.status === 'completed'; }).length,
            pending: transactions.filter(function(t) { return t.status === 'pending'; }).length,
            failed: transactions.filter(function(t) { return t.status === 'failed'; }).length,
            totalAmount: transactions.reduce(function(sum, t) {
                return sum + (t.status === 'completed' ? parseFloat(t.amount || 0) : 0);
            }, 0)
        };
    },

    // ============================================
    // RENDER TRANSACTION LIST
    // ============================================
    renderTransactionList(container, transactions) {
        transactions = transactions || this.getTransactions();
        transactions = transactions.slice().reverse();

        if (transactions.length === 0) {
            container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);"><i class="fas fa-mobile-alt" style="font-size:2rem;display:block;margin-bottom:12px;"></i>No M-Pesa transactions found</div>';
            return;
        }

        container.innerHTML = transactions.slice(0, 50).map(function(t) {
            const status = Mpesa.statuses[t.status] || Mpesa.statuses.pending;
            const typeInfo = Mpesa.transactionTypes.find(function(tt) { return tt.id === t.type; }) || { name: t.type || 'General', icon: 'fa-donate' };

            return `
                <div class="item" style="border-left:3px solid ${status.color};">
                    <div class="item-icon"><i class="fas ${typeInfo.icon}" style="color:var(--primary);"></i></div>
                    <div class="item-content">
                        <div class="item-title">${typeInfo.name} - ${formatCurrency(t.amount)}</div>
                        <div class="item-meta">${t.phone} · ${formatDate(t.createdAt)}</div>
                        <div style="font-size:0.8rem;color:var(--text-secondary);">${t.description || 'No description'}</div>
                    </div>
                    <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
                        <span class="item-status" style="background:${status.color}20;color:${status.color};">${status.label}</span>
                        <span style="font-size:0.65rem;color:var(--text-secondary);">${t.transactionId || 'N/A'}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    // ============================================
    // RENDER TRANSACTION STATS
    // ============================================
    renderStats(container) {
        const summary = this.getSummary();

        container.innerHTML = `
            <div class="stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr));">
                <div class="stat-card" style="padding:12px 16px;">
                    <div class="stat-value" style="font-size:1.2rem;">${summary.total}</div>
                    <div class="stat-label">Total</div>
                </div>
                <div class="stat-card" style="padding:12px 16px;border-left:3px solid var(--success);">
                    <div class="stat-value" style="font-size:1.2rem;color:var(--success);">${summary.completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card" style="padding:12px 16px;border-left:3px solid var(--warning);">
                    <div class="stat-value" style="font-size:1.2rem;color:var(--warning);">${summary.pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card" style="padding:12px 16px;border-left:3px solid var(--danger);">
                    <div class="stat-value" style="font-size:1.2rem;color:var(--danger);">${summary.failed}</div>
                    <div class="stat-label">Failed</div>
                </div>
                <div class="stat-card" style="padding:12px 16px;">
                    <div class="stat-value" style="font-size:1.2rem;">${formatCurrency(summary.totalAmount)}</div>
                    <div class="stat-label">Total Amount</div>
                </div>
                <div class="stat-card" style="padding:12px 16px;">
                    <div class="stat-value" style="font-size:1.2rem;">${summary.successRate}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
            </div>
        `;
    }
};
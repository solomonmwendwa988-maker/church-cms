const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// DATABASE CONNECTION
// ============================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect((err) => {
    if (err) {
        console.log('Database connection failed:', err.message);
    } else {
        console.log('Database connected successfully');
    }
});

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// ============================================
// HTTP SERVER & SOCKET.IO
// ============================================

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Track online users
var onlineUsers = {};

// ============================================
// AUTH MIDDLEWARE
// ============================================

function authenticateToken(req, res, next) {
    var authHeader = req.headers['authorization'];
    var token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        var decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

io.on('connection', function(socket) {
    console.log('Client connected:', socket.id);

    socket.on('user_online', function(userData) {
        onlineUsers[socket.id] = {
            userId: userData.userId,
            name: userData.name,
            role: userData.role,
            connectedAt: new Date().toISOString()
        };
        var usersList = Object.values(onlineUsers);
        io.emit('users_online', usersList);
        console.log('User online:', userData.name, 'Total:', usersList.length);
    });

    socket.on('join', function(userId) {
        socket.join('user_' + userId);
        console.log('User joined room:', userId);
    });

    socket.on('disconnect', function() {
        var user = onlineUsers[socket.id];
        if (user) {
            console.log('User offline:', user.name);
            delete onlineUsers[socket.id];
            var usersList = Object.values(onlineUsers);
            io.emit('users_online', usersList);
        }
        console.log('Client disconnected:', socket.id);
    });
});

// ============================================
// BROADCAST HELPERS
// ============================================

function broadcastEvent(eventName, data) {
    io.emit(eventName, data);
    console.log('Broadcast:', eventName);
}

// ============================================
// INIT DATABASE TABLES
// ============================================

async function initDatabase() {
    var queries = [
        `CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) DEFAULT 'member',
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            join_date VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Active',
            membership_type VARCHAR(50) DEFAULT 'Full',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS events (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100) DEFAULT 'Service',
            start_date VARCHAR(50),
            end_date VARCHAR(50),
            start_time VARCHAR(50),
            end_time VARCHAR(50),
            venue VARCHAR(255),
            capacity INTEGER DEFAULT 0,
            registered INTEGER DEFAULT 0,
            status VARCHAR(50) DEFAULT 'Upcoming',
            speaker VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS giving (
            id SERIAL PRIMARY KEY,
            member_id INTEGER,
            member_name VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(100) DEFAULT 'Tithe',
            payment_method VARCHAR(100) DEFAULT 'Cash',
            date VARCHAR(50),
            receipt_number VARCHAR(100),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS mpesa_transactions (
            id SERIAL PRIMARY KEY,
            transaction_id VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            type VARCHAR(100) DEFAULT 'general',
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS sermons (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            series VARCHAR(255),
            preacher VARCHAR(255) NOT NULL,
            date VARCHAR(50),
            description TEXT,
            scripture VARCHAR(255),
            notes TEXT,
            audio_url TEXT,
            duration VARCHAR(50),
            status VARCHAR(50) DEFAULT 'published',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS prayer_requests (
            id SERIAL PRIMARY KEY,
            member_name VARCHAR(255) NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            assigned_to TEXT,
            answered_date VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS budgets (
            id SERIAL PRIMARY KEY,
            category VARCHAR(255) NOT NULL,
            allocated DECIMAL(10,2) NOT NULL,
            spent DECIMAL(10,2) DEFAULT 0,
            period VARCHAR(50) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS pledges (
            id SERIAL PRIMARY KEY,
            member_id INTEGER,
            member_name VARCHAR(255) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            category VARCHAR(255) NOT NULL,
            start_date VARCHAR(50),
            end_date VARCHAR(50),
            paid DECIMAL(10,2) DEFAULT 0,
            balance DECIMAL(10,2) DEFAULT 0,
            status VARCHAR(50) DEFAULT 'active',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            recipient VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            sent_at VARCHAR(50),
            channel VARCHAR(50) DEFAULT 'email',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS media (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            type VARCHAR(50) NOT NULL,
            mime_type VARCHAR(100),
            size INTEGER,
            data TEXT,
            uploaded_at VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    for (var i = 0; i < queries.length; i++) {
        try {
            await pool.query(queries[i]);
        } catch (err) {
            console.log('Table creation warning:', err.message);
        }
    }

    console.log('Database tables initialized');
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', function(req, res) {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/register', async function(req, res) {
    try {
        var { name, email, password, role } = req.body;

        var existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        var salt = await bcrypt.genSalt(10);
        var hashedPassword = await bcrypt.hash(password, salt);

        var result = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, status, created_at',
            [name, email, hashedPassword, role || 'member']
        );

        var user = result.rows[0];
        var token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        broadcastEvent('user_created', user);

        res.json({ user: user, token: token });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async function(req, res) {
    try {
        var { email, password } = req.body;

        var result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        var user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        var validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        var token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        var userWithoutPassword = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
            created_at: user.created_at
        };

        res.json({ user: userWithoutPassword, token: token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query(
            'SELECT id, name, email, role, status, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        var user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// ============================================
// MEMBERS ROUTES
// ============================================

app.get('/api/members', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM members ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get members' });
    }
});

app.post('/api/members', authenticateToken, async function(req, res) {
    try {
        var { first_name, last_name, email, phone, address, join_date, status, membership_type, notes } = req.body;
        var result = await pool.query(
            'INSERT INTO members (first_name, last_name, email, phone, address, join_date, status, membership_type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [first_name, last_name, email, phone, address, join_date || new Date().toISOString().split('T')[0], status || 'Active', membership_type || 'Full', notes]
        );
        var member = result.rows[0];
        broadcastEvent('member_created', member);
        res.status(201).json(member);
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

app.put('/api/members/:id', authenticateToken, async function(req, res) {
    try {
        var id = parseInt(req.params.id);
        var { first_name, last_name, email, phone, address, join_date, status, membership_type, notes } = req.body;
        var result = await pool.query(
            'UPDATE members SET first_name = $1, last_name = $2, email = $3, phone = $4, address = $5, join_date = $6, status = $7, membership_type = $8, notes = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10 RETURNING *',
            [first_name, last_name, email, phone, address, join_date, status, membership_type, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        broadcastEvent('member_updated', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update member' });
    }
});

app.delete('/api/members/:id', authenticateToken, async function(req, res) {
    try {
        var id = parseInt(req.params.id);
        await pool.query('DELETE FROM members WHERE id = $1', [id]);
        broadcastEvent('member_deleted', { id: id });
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// ============================================
// EVENTS ROUTES
// ============================================

app.get('/api/events', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM events ORDER BY start_date ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get events' });
    }
});

app.post('/api/events', authenticateToken, async function(req, res) {
    try {
        var { title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes } = req.body;
        var result = await pool.query(
            'INSERT INTO events (title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
            [title, description, category || 'Service', start_date, end_date, start_time, end_time, venue, capacity || 0, status || 'Upcoming', speaker, notes]
        );
        var event = result.rows[0];
        broadcastEvent('event_created', event);
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.put('/api/events/:id', authenticateToken, async function(req, res) {
    try {
        var id = parseInt(req.params.id);
        var { title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes } = req.body;
        var result = await pool.query(
            'UPDATE events SET title = $1, description = $2, category = $3, start_date = $4, end_date = $5, start_time = $6, end_time = $7, venue = $8, capacity = $9, status = $10, speaker = $11, notes = $12, updated_at = CURRENT_TIMESTAMP WHERE id = $13 RETURNING *',
            [title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        broadcastEvent('event_updated', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.delete('/api/events/:id', authenticateToken, async function(req, res) {
    try {
        var id = parseInt(req.params.id);
        await pool.query('DELETE FROM events WHERE id = $1', [id]);
        broadcastEvent('event_deleted', { id: id });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// ============================================
// GIVING ROUTES
// ============================================

app.get('/api/giving', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM giving ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get giving records' });
    }
});

app.post('/api/giving', authenticateToken, async function(req, res) {
    try {
        var { member_id, member_name, amount, category, payment_method, date, receipt_number, notes } = req.body;
        var result = await pool.query(
            'INSERT INTO giving (member_id, member_name, amount, category, payment_method, date, receipt_number, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [member_id, member_name, amount, category || 'Tithe', payment_method || 'Cash', date || new Date().toISOString().split('T')[0], receipt_number, notes]
        );
        var giving = result.rows[0];
        broadcastEvent('giving_created', giving);
        res.status(201).json(giving);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create giving record' });
    }
});

// ============================================
// USERS ROUTES (Admin Only)
// ============================================

app.get('/api/users', authenticateToken, async function(req, res) {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        var result = await pool.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

app.put('/api/users/:id', authenticateToken, async function(req, res) {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        var id = parseInt(req.params.id);
        var { name, email, role, status } = req.body;
        var result = await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING id, name, email, role, status',
            [name, email, role, status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        broadcastEvent('user_updated', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:id', authenticateToken, async function(req, res) {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        var id = parseInt(req.params.id);
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        broadcastEvent('user_deleted', { id: id });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// ============================================
// M-PESA ROUTES
// ============================================

app.get('/api/mpesa', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM mpesa_transactions ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get M-Pesa transactions' });
    }
});

app.post('/api/mpesa', authenticateToken, async function(req, res) {
    try {
        var { transaction_id, phone, amount, type, description, status } = req.body;
        var result = await pool.query(
            'INSERT INTO mpesa_transactions (transaction_id, phone, amount, type, description, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [transaction_id, phone, amount, type || 'general', description, status || 'pending']
        );
        var transaction = result.rows[0];
        broadcastEvent('mpesa_transaction', transaction);
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create M-Pesa transaction' });
    }
});

// ============================================
// SERMONS ROUTES
// ============================================

app.get('/api/sermons', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM sermons ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get sermons' });
    }
});

app.post('/api/sermons', authenticateToken, async function(req, res) {
    try {
        var { title, series, preacher, date, description, scripture, notes, audio_url, duration, status } = req.body;
        var result = await pool.query(
            'INSERT INTO sermons (title, series, preacher, date, description, scripture, notes, audio_url, duration, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [title, series, preacher, date || new Date().toISOString().split('T')[0], description, scripture, notes, audio_url, duration, status || 'published']
        );
        var sermon = result.rows[0];
        broadcastEvent('sermon_created', sermon);
        res.status(201).json(sermon);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create sermon' });
    }
});

// ============================================
// PRAYER REQUESTS ROUTES
// ============================================

app.get('/api/prayer-requests', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM prayer_requests ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get prayer requests' });
    }
});

app.post('/api/prayer-requests', authenticateToken, async function(req, res) {
    try {
        var { member_name, title, description, status, assigned_to } = req.body;
        var result = await pool.query(
            'INSERT INTO prayer_requests (member_name, title, description, status, assigned_to) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [member_name, title, description, status || 'active', assigned_to]
        );
        var prayer = result.rows[0];
        broadcastEvent('prayer_created', prayer);
        res.status(201).json(prayer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create prayer request' });
    }
});

// ============================================
// BUDGET ROUTES
// ============================================

app.get('/api/budgets', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM budgets ORDER BY period DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get budgets' });
    }
});

app.post('/api/budgets', authenticateToken, async function(req, res) {
    try {
        var { category, allocated, spent, period, notes } = req.body;
        var result = await pool.query(
            'INSERT INTO budgets (category, allocated, spent, period, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [category, allocated, spent || 0, period, notes]
        );
        var budget = result.rows[0];
        broadcastEvent('budget_created', budget);
        res.status(201).json(budget);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create budget' });
    }
});

// ============================================
// PLEDGES ROUTES
// ============================================

app.get('/api/pledges', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM pledges ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get pledges' });
    }
});

app.post('/api/pledges', authenticateToken, async function(req, res) {
    try {
        var { member_id, member_name, amount, category, start_date, end_date, paid, balance, status, notes } = req.body;
        var result = await pool.query(
            'INSERT INTO pledges (member_id, member_name, amount, category, start_date, end_date, paid, balance, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [member_id, member_name, amount, category, start_date, end_date, paid || 0, balance || amount, status || 'active', notes]
        );
        var pledge = result.rows[0];
        broadcastEvent('pledge_created', pledge);
        res.status(201).json(pledge);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create pledge' });
    }
});

// ============================================
// NOTIFICATIONS ROUTES
// ============================================

app.get('/api/notifications', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

app.post('/api/notifications', authenticateToken, async function(req, res) {
    try {
        var { type, subject, message, recipient, status, sent_at, channel } = req.body;
        var result = await pool.query(
            'INSERT INTO notifications (type, subject, message, recipient, status, sent_at, channel) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [type, subject, message, recipient, status || 'pending', sent_at || new Date().toISOString(), channel || 'email']
        );
        var notification = result.rows[0];
        broadcastEvent('notification_created', notification);
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// ============================================
// MEDIA ROUTES
// ============================================

app.get('/api/media', authenticateToken, async function(req, res) {
    try {
        var result = await pool.query('SELECT id, name, type, mime_type, size, uploaded_at, created_at FROM media ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get media' });
    }
});

app.post('/api/media', authenticateToken, async function(req, res) {
    try {
        var { name, type, mime_type, size, data, uploaded_at } = req.body;
        var result = await pool.query(
            'INSERT INTO media (name, type, mime_type, size, data, uploaded_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, type, mime_type, size, uploaded_at, created_at',
            [name, type, mime_type, size, data, uploaded_at || new Date().toISOString()]
        );
        var media = result.rows[0];
        broadcastEvent('media_created', media);
        res.status(201).json(media);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create media' });
    }
});

app.delete('/api/media/:id', authenticateToken, async function(req, res) {
    try {
        var id = parseInt(req.params.id);
        await pool.query('DELETE FROM media WHERE id = $1', [id]);
        broadcastEvent('media_deleted', { id: id });
        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete media' });
    }
});

// ============================================
// SYNC ROUTE
// ============================================

app.post('/api/sync', authenticateToken, async function(req, res) {
    try {
        var { data } = req.body;
        var results = {};

        if (data.members && data.members.length > 0) {
            results.members = [];
            for (var i = 0; i < data.members.length; i++) {
                var member = data.members[i];
                var result = await pool.query(
                    'INSERT INTO members (first_name, last_name, email, phone, address, join_date, status, membership_type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email, phone = EXCLUDED.phone, address = EXCLUDED.address, status = EXCLUDED.status, membership_type = EXCLUDED.membership_type, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP RETURNING *',
                    [member.first_name, member.last_name, member.email, member.phone, member.address, member.join_date, member.status, member.membership_type, member.notes]
                );
                results.members.push(result.rows[0]);
            }
        }

        broadcastEvent('sync_completed', { userId: req.user.id });

        res.json({ success: true, results: results });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Sync failed: ' + error.message });
    }
});

// ============================================
// SEED ADMIN USER
// ============================================

async function seedAdmin() {
    try {
        var check = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@church.com']);
        if (check.rows.length === 0) {
            var salt = await bcrypt.genSalt(10);
            var hashedPassword = await bcrypt.hash('password123', salt);
            await pool.query(
                'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
                ['Admin User', 'admin@church.com', hashedPassword, 'admin']
            );
            console.log('Admin user created: admin@church.com / password123');
        } else {
            console.log('Admin user already exists');
        }
    } catch (error) {
        console.log('Admin seed warning:', error.message);
    }
}

// ============================================
// START SERVER
// ============================================

async function startServer() {
    await initDatabase();
    await seedAdmin();

    server.listen(PORT, function() {
        console.log('');
        console.log('Victory Life CMS - Backend Server');
        console.log('Server running on http://localhost:' + PORT);
        console.log('API: http://localhost:' + PORT + '/api');
        console.log('WebSocket: ws://localhost:' + PORT);
        console.log('Database: PostgreSQL');
        console.log('Real-time broadcasting: Enabled');
        console.log('');
    });
}

startServer();
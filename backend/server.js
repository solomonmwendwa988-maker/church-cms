// ============================================
// VICTORY LIFE CMS - BACKEND (FIXED)
// ============================================

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
        console.log('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully');
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
let onlineUsers = {};

// ============================================
// AUTH MIDDLEWARE
// ============================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
}

// ============================================
// INIT DATABASE TABLES
// ============================================

async function initDatabase() {
    const queries = [
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

    for (const query of queries) {
        try {
            await pool.query(query);
        } catch (err) {
            console.log('⚠️ Table warning:', err.message);
        }
    }

    console.log('✅ Database tables initialized');
}

// ============================================
// WEBSOCKET EVENTS
// ============================================

io.on('connection', (socket) => {
    console.log('🟢 Client connected:', socket.id);

    socket.on('user_online', (userData) => {
        onlineUsers[socket.id] = {
            userId: userData.userId,
            name: userData.name,
            role: userData.role,
            connectedAt: new Date().toISOString()
        };
        const usersList = Object.values(onlineUsers);
        io.emit('users_online', usersList);
    });

    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        const usersList = Object.values(onlineUsers);
        io.emit('users_online', usersList);
        console.log('🔴 Client disconnected:', socket.id);
    });
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// AUTH ROUTES
// ============================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
            `INSERT INTO users (name, email, password, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, role, status, created_at`,
            [name, email, hashedPassword, role || 'member']
        );

        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ user, token });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        const { password: _, ...userWithoutPassword } = user;

        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, email, role, status, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        const user = result.rows[0];
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

app.get('/api/members', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM members ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get members' });
    }
});

app.post('/api/members', authenticateToken, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, address, join_date, status, membership_type, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO members (first_name, last_name, email, phone, address, join_date, status, membership_type, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [first_name, last_name, email, phone, address, join_date || new Date().toISOString().split('T')[0], status || 'Active', membership_type || 'Full', notes]
        );
        const member = result.rows[0];
        io.emit('member_created', member);
        res.status(201).json(member);
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

app.put('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { first_name, last_name, email, phone, address, join_date, status, membership_type, notes } = req.body;
        const result = await pool.query(
            `UPDATE members SET 
                first_name = $1, last_name = $2, email = $3, phone = $4, address = $5, 
                join_date = $6, status = $7, membership_type = $8, notes = $9,
                updated_at = CURRENT_TIMESTAMP 
             WHERE id = $10 RETURNING *`,
            [first_name, last_name, email, phone, address, join_date, status, membership_type, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        io.emit('member_updated', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update member' });
    }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM members WHERE id = $1', [id]);
        io.emit('member_deleted', { id });
        res.json({ message: 'Member deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// ============================================
// EVENTS ROUTES
// ============================================

app.get('/api/events', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY start_date ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get events' });
    }
});

app.post('/api/events', authenticateToken, async (req, res) => {
    try {
        const { title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO events (title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             RETURNING *`,
            [title, description, category || 'Service', start_date, end_date, start_time, end_time, venue, capacity || 0, status || 'Upcoming', speaker, notes]
        );
        const event = result.rows[0];
        io.emit('event_created', event);
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.put('/api/events/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes } = req.body;
        const result = await pool.query(
            `UPDATE events SET 
                title = $1, description = $2, category = $3, start_date = $4, end_date = $5, 
                start_time = $6, end_time = $7, venue = $8, capacity = $9, status = $10, speaker = $11, notes = $12,
                updated_at = CURRENT_TIMESTAMP 
             WHERE id = $13 RETURNING *`,
            [title, description, category, start_date, end_date, start_time, end_time, venue, capacity, status, speaker, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        io.emit('event_updated', result.rows[0]);
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.delete('/api/events/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM events WHERE id = $1', [id]);
        io.emit('event_deleted', { id });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// ============================================
// GIVING ROUTES
// ============================================

app.get('/api/giving', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM giving ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get giving records' });
    }
});

app.post('/api/giving', authenticateToken, async (req, res) => {
    try {
        const { member_id, member_name, amount, category, payment_method, date, receipt_number, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO giving (member_id, member_name, amount, category, payment_method, date, receipt_number, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [member_id, member_name, amount, category || 'Tithe', payment_method || 'Cash', date || new Date().toISOString().split('T')[0], receipt_number, notes]
        );
        const giving = result.rows[0];
        io.emit('giving_created', giving);
        res.status(201).json(giving);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create giving record' });
    }
});

// ============================================
// USERS ROUTES
// ============================================

app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const result = await pool.query(
            'SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// ============================================
// M-PESA ROUTES
// ============================================

app.get('/api/mpesa', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM mpesa_transactions ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get M-Pesa transactions' });
    }
});

app.post('/api/mpesa', authenticateToken, async (req, res) => {
    try {
        const { transaction_id, phone, amount, type, description, status } = req.body;
        const result = await pool.query(
            `INSERT INTO mpesa_transactions (transaction_id, phone, amount, type, description, status) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [transaction_id, phone, amount, type || 'general', description, status || 'pending']
        );
        const transaction = result.rows[0];
        io.emit('mpesa_transaction', transaction);
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create M-Pesa transaction' });
    }
});

// ============================================
// SERMONS ROUTES
// ============================================

app.get('/api/sermons', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sermons ORDER BY date DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get sermons' });
    }
});

app.post('/api/sermons', authenticateToken, async (req, res) => {
    try {
        const { title, series, preacher, date, description, scripture, notes, audio_url, duration, status } = req.body;
        const result = await pool.query(
            `INSERT INTO sermons (title, series, preacher, date, description, scripture, notes, audio_url, duration, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [title, series, preacher, date || new Date().toISOString().split('T')[0], description, scripture, notes, audio_url, duration, status || 'published']
        );
        const sermon = result.rows[0];
        io.emit('sermon_created', sermon);
        res.status(201).json(sermon);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create sermon' });
    }
});

// ============================================
// SEED ADMIN USER
// ============================================

async function seedAdmin() {
    try {
        const check = await pool.query('SELECT * FROM users WHERE email = $1', ['admin@church.com']);
        if (check.rows.length === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('password123', salt);
            await pool.query(
                `INSERT INTO users (name, email, password, role) 
                 VALUES ($1, $2, $3, $4)`,
                ['Admin User', 'admin@church.com', hashedPassword, 'admin']
            );
            console.log('✅ Admin user created: admin@church.com / password123');
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (error) {
        console.log('⚠️ Admin seed warning:', error.message);
    }
}

// ============================================
// START SERVER
// ============================================

async function startServer() {
    await initDatabase();
    await seedAdmin();

    server.listen(PORT, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║     VICTORY LIFE CMS - BACKEND SERVER           ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║   🚀 Server running on http://localhost:${PORT}    ║`);
        console.log(`║   📡 API: http://localhost:${PORT}/api            ║`);
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');
    });
}

startServer();
// ============================================
// VICTORY LIFE CMS - SIMPLIFIED BACKEND
// No Prisma - Uses raw PostgreSQL with 'pg' package
// ============================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// DATABASE CONNECTION
// ============================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

// Test database connection
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
        // Users table
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

        // Members table
        `CREATE TABLE IF NOT EXISTS members (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(255) NOT NULL,
            last_name VARCHAR(255) NOT NULL,
            email VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            date_of_birth VARCHAR(50),
            gender VARCHAR(20),
            join_date VARCHAR(50),
            status VARCHAR(50) DEFAULT 'Active',
            membership_type VARCHAR(50) DEFAULT 'Full',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Events table
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
            reminders INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Giving table
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
            transaction_id VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // M-Pesa transactions table
        `CREATE TABLE IF NOT EXISTS mpesa_transactions (
            id SERIAL PRIMARY KEY,
            transaction_id VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            type VARCHAR(100) DEFAULT 'general',
            description TEXT,
            status VARCHAR(50) DEFAULT 'pending',
            merchant_request_id VARCHAR(100),
            checkout_request_id VARCHAR(100),
            result_code VARCHAR(50),
            result_desc TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Sermons table
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

        // Prayer Requests table
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

        // Budgets table
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

        // Pledges table
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

        // Notifications table
        `CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            recipient VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            sent_at VARCHAR(50),
            channel VARCHAR(50) DEFAULT 'email',
            event_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

        // Media table
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
            console.log('⚠️ Table creation warning:', err.message);
        }
    }

    console.log('✅ Database tables initialized');
}

// ============================================
// AUTH ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user exists
        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const result = await pool.query(
            `INSERT INTO users (name, email, password, role) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, name, email, role, status, created_at`,
            [name, email, hashedPassword, role || 'member']
        );

        const user = result.rows[0];

        // Generate token
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

// Login
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

// Get current user
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
// USERS ROUTES (Admin only)
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

app.put('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const id = parseInt(req.params.id);
        const { name, email, role, status } = req.body;
        const result = await pool.query(
            `UPDATE users SET name = $1, email = $2, role = $3, status = $4, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $5 RETURNING id, name, email, role, status`,
            [name, email, role, status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
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

app.get('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query('SELECT * FROM members WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get member' });
    }
});

app.post('/api/members', authenticateToken, async (req, res) => {
    try {
        const { first_name, last_name, email, phone, address, date_of_birth, gender, join_date, status, membership_type, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO members (first_name, last_name, email, phone, address, date_of_birth, gender, join_date, status, membership_type, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
             RETURNING *`,
            [first_name, last_name, email, phone, address, date_of_birth, gender, join_date || new Date().toISOString().split('T')[0], status || 'Active', membership_type || 'Full', notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

app.put('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { first_name, last_name, email, phone, address, date_of_birth, gender, join_date, status, membership_type, notes } = req.body;
        const result = await pool.query(
            `UPDATE members SET 
                first_name = $1, last_name = $2, email = $3, phone = $4, address = $5, 
                date_of_birth = $6, gender = $7, join_date = $8, status = $9, membership_type = $10, notes = $11,
                updated_at = CURRENT_TIMESTAMP 
             WHERE id = $12 RETURNING *`,
            [first_name, last_name, email, phone, address, date_of_birth, gender, join_date, status, membership_type, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update member' });
    }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM members WHERE id = $1', [id]);
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

app.get('/api/events/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get event' });
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
        res.status(201).json(result.rows[0]);
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
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.delete('/api/events/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM events WHERE id = $1', [id]);
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

app.get('/api/giving/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await pool.query('SELECT * FROM giving WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Giving record not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get giving record' });
    }
});

app.post('/api/giving', authenticateToken, async (req, res) => {
    try {
        const { member_id, member_name, amount, category, payment_method, date, receipt_number, notes, transaction_id } = req.body;
        const result = await pool.query(
            `INSERT INTO giving (member_id, member_name, amount, category, payment_method, date, receipt_number, notes, transaction_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
             RETURNING *`,
            [member_id, member_name, amount, category || 'Tithe', payment_method || 'Cash', date || new Date().toISOString().split('T')[0], receipt_number, notes, transaction_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create giving record' });
    }
});

// ============================================
// M-PESA TRANSACTIONS ROUTES
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
        res.status(201).json(result.rows[0]);
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
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create sermon' });
    }
});

// ============================================
// PRAYER REQUESTS ROUTES
// ============================================

app.get('/api/prayer-requests', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM prayer_requests ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get prayer requests' });
    }
});

app.post('/api/prayer-requests', authenticateToken, async (req, res) => {
    try {
        const { member_name, title, description, status, assigned_to } = req.body;
        const result = await pool.query(
            `INSERT INTO prayer_requests (member_name, title, description, status, assigned_to) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [member_name, title, description, status || 'active', assigned_to]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create prayer request' });
    }
});

// ============================================
// BUDGET ROUTES
// ============================================

app.get('/api/budgets', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM budgets ORDER BY period DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get budgets' });
    }
});

app.post('/api/budgets', authenticateToken, async (req, res) => {
    try {
        const { category, allocated, spent, period, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO budgets (category, allocated, spent, period, notes) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [category, allocated, spent || 0, period, notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create budget' });
    }
});

// ============================================
// PLEDGES ROUTES
// ============================================

app.get('/api/pledges', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM pledges ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get pledges' });
    }
});

app.post('/api/pledges', authenticateToken, async (req, res) => {
    try {
        const { member_id, member_name, amount, category, start_date, end_date, paid, balance, status, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO pledges (member_id, member_name, amount, category, start_date, end_date, paid, balance, status, notes) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
             RETURNING *`,
            [member_id, member_name, amount, category, start_date, end_date, paid || 0, balance || amount, status || 'active', notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create pledge' });
    }
});

// ============================================
// NOTIFICATIONS ROUTES
// ============================================

app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const { type, subject, message, recipient, status, sent_at, channel, event_id } = req.body;
        const result = await pool.query(
            `INSERT INTO notifications (type, subject, message, recipient, status, sent_at, channel, event_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [type, subject, message, recipient, status || 'pending', sent_at || new Date().toISOString(), channel || 'email', event_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// ============================================
// MEDIA ROUTES
// ============================================

app.get('/api/media', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, type, mime_type, size, uploaded_at, created_at FROM media ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get media' });
    }
});

app.post('/api/media', authenticateToken, async (req, res) => {
    try {
        const { name, type, mime_type, size, data, uploaded_at } = req.body;
        const result = await pool.query(
            `INSERT INTO media (name, type, mime_type, size, data, uploaded_at) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, name, type, mime_type, size, uploaded_at, created_at`,
            [name, type, mime_type, size, data, uploaded_at || new Date().toISOString()]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create media' });
    }
});

app.delete('/api/media/:id', authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        await pool.query('DELETE FROM media WHERE id = $1', [id]);
        res.json({ message: 'Media deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete media' });
    }
});

// ============================================
// SYNC ROUTE
// ============================================

app.post('/api/sync', authenticateToken, async (req, res) => {
    try {
        const { data } = req.body;
        const results = {};

        // Sync members
        if (data.members && data.members.length > 0) {
            results.members = [];
            for (const member of data.members) {
                const result = await pool.query(
                    `INSERT INTO members (first_name, last_name, email, phone, address, join_date, status, membership_type, notes) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                     ON CONFLICT (id) DO UPDATE SET 
                     first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, email = EXCLUDED.email,
                     phone = EXCLUDED.phone, address = EXCLUDED.address, status = EXCLUDED.status,
                     membership_type = EXCLUDED.membership_type, notes = EXCLUDED.notes, updated_at = CURRENT_TIMESTAMP
                     RETURNING *`,
                    [member.first_name, member.last_name, member.email, member.phone, member.address, member.join_date, member.status, member.membership_type, member.notes]
                );
                results.members.push(result.rows[0]);
            }
        }

        res.json({ success: true, results });
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

    app.listen(PORT, () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════════╗');
        console.log('║     VICTORY LIFE CMS - BACKEND SERVER           ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║   🚀 Server running on http://localhost:${PORT}    ║`);
        console.log(`║   📡 API: http://localhost:${PORT}/api            ║`);
        console.log('║   🔗 Database: PostgreSQL                        ║');
        console.log('╚══════════════════════════════════════════════════╝');
        console.log('');
    });
}

startServer();
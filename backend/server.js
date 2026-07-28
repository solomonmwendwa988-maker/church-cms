// ============================================
// VICTORY LIFE CMS - BACKEND SERVER
// ============================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// ============================================
// MIDDLEWARE
// ============================================

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'member'
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true
            }
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
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

        const user = await prisma.user.findUnique({
            where: { email }
        });

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
            { expiresIn: process.env.JWT_EXPIRES_IN }
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
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });
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
        const members = await prisma.member.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(members);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get members' });
    }
});

app.post('/api/members', authenticateToken, async (req, res) => {
    try {
        const member = await prisma.member.create({ data: req.body });
        io.emit('member_created', member);
        res.status(201).json(member);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create member' });
    }
});

app.put('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        const member = await prisma.member.update({
            where: { id: memberId },
            data: req.body
        });
        io.emit('member_updated', member);
        res.json(member);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update member' });
    }
});

app.delete('/api/members/:id', authenticateToken, async (req, res) => {
    try {
        const memberId = parseInt(req.params.id);
        await prisma.member.delete({ where: { id: memberId } });
        io.emit('member_deleted', { id: memberId });
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
        const events = await prisma.event.findMany({
            orderBy: { startDate: 'asc' }
        });
        res.json(events);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get events' });
    }
});

app.post('/api/events', authenticateToken, async (req, res) => {
    try {
        const event = await prisma.event.create({ data: req.body });
        io.emit('event_created', event);
        res.status(201).json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create event' });
    }
});

app.put('/api/events/:id', authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        const event = await prisma.event.update({
            where: { id: eventId },
            data: req.body
        });
        io.emit('event_updated', event);
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update event' });
    }
});

app.delete('/api/events/:id', authenticateToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.id);
        await prisma.event.delete({ where: { id: eventId } });
        io.emit('event_deleted', { id: eventId });
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
        const giving = await prisma.giving.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(giving);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get giving records' });
    }
});

app.post('/api/giving', authenticateToken, async (req, res) => {
    try {
        const giving = await prisma.giving.create({ data: req.body });
        io.emit('giving_created', giving);
        res.status(201).json(giving);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create giving record' });
    }
});

// ============================================
// SERMONS ROUTES
// ============================================

app.get('/api/sermons', authenticateToken, async (req, res) => {
    try {
        const sermons = await prisma.sermon.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(sermons);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get sermons' });
    }
});

app.post('/api/sermons', authenticateToken, async (req, res) => {
    try {
        const sermon = await prisma.sermon.create({ data: req.body });
        io.emit('sermon_created', sermon);
        res.status(201).json(sermon);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create sermon' });
    }
});

// ============================================
// M-PESA ROUTES
// ============================================

app.get('/api/mpesa', authenticateToken, async (req, res) => {
    try {
        const transactions = await prisma.mpesaTransaction.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get M-Pesa transactions' });
    }
});

app.post('/api/mpesa', authenticateToken, async (req, res) => {
    try {
        const transaction = await prisma.mpesaTransaction.create({ data: req.body });
        io.emit('mpesa_transaction', transaction);
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create M-Pesa transaction' });
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
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// ============================================
// SYNC ROUTE
// ============================================

app.post('/api/sync', authenticateToken, async (req, res) => {
    try {
        const { data } = req.body;
        const results = {};

        if (data.members) {
            results.members = await prisma.$transaction(
                data.members.map(member =>
                    prisma.member.upsert({
                        where: { id: member.id || 0 },
                        update: member,
                        create: member
                    })
                )
            );
        }

        if (data.events) {
            results.events = await prisma.$transaction(
                data.events.map(event =>
                    prisma.event.upsert({
                        where: { id: event.id || 0 },
                        update: event,
                        create: event
                    })
                )
            );
        }

        if (data.giving) {
            results.giving = await prisma.$transaction(
                data.giving.map(g =>
                    prisma.giving.upsert({
                        where: { id: g.id || 0 },
                        update: g,
                        create: g
                    })
                )
            );
        }

        io.emit('sync_completed', { userId: req.user.id });
        res.json({ success: true, results });
    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ error: 'Sync failed: ' + error.message });
    }
});

// ============================================
// WEBSOCKET
// ============================================

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
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
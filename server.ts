/**
 * NetVoya Backend Server
 * Express API for user registration and authentication
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface User {
    id: string;
    username: string;
    email: string;
    password: string; // hashed
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
    vatId?: string;
    role: 'partner' | 'admin';
    createdAt: Date;
}

interface RegistrationRequest {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
    vatId?: string;
    role: 'partner' | 'admin';
}

interface LoginRequest {
    email: string;
    password: string;
}

interface ApiResponse {
    success: boolean;
    message: string;
    user?: {
        id: string;
        username: string;
        email: string;
        role: string;
    };
    token?: string;
}

// =============================================================================
// DATABASE CONNECTION
// =============================================================================
import mongoose from 'mongoose';
import User from './models/User.js';

const MONGO_URI = process.env.MONGO_URI || '';

if (!MONGO_URI) {
    console.warn("⚠️  WARNING: MONGO_URI is not defined in .env file.");
    console.warn("    Server will run but database connection will fail.");
}

// Global variable to store connection error
let mongoConnectionError: string | null = null;

const connectDB = async () => {
    try {
        // Log masked URI to verify it's loaded correctly
        const maskedURI = MONGO_URI.replace(/:([^:@]+)@/, ':****@');
        console.log(`📡 Attempting to connect to: ${maskedURI}`);

        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 30000, // Increased to 30s for Vercel
            socketTimeoutMS: 45000,
        } as any);

        console.log('✅ Connected to MongoDB Atlas');
        mongoConnectionError = null; // Clear error on success
    } catch (err: any) {
        console.error('❌ MongoDB Connection Error:', err.message);
        mongoConnectionError = err.message; // Store error

        if (err.message && (err.message.includes('ReplicaSetNoPrimary') || err.message.includes('MongooseServerSelectionError'))) {
            // ... (keep existing hints)
        }
    }
};

// Connect to Database
connectDB();

// =============================================================================
// IN-MEMORY STORAGE (DEPRECATED - REMOVED)
// =============================================================================
// Reference to interfaces/types moved to models/User.ts

// =============================================================================
// MIDDLEWARE
// =============================================================================
app.use(express.json()); // Parse JSON bodies
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://netvoya.vercel.app',
    'https://netvoya.com',
    'https://www.netvoya.com'
];

if (process.env.CORS_ORIGINS) {
    allowedOrigins.push(...process.env.CORS_ORIGINS.split(','));
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate JWT token for authenticated user
 */
const generateToken = (user: any): string => { // User type now comes from Mongoose model
    return jwt.sign(
        {
            id: user._id, // Mongoose uses _id
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// =============================================================================
// API ROUTES
// =============================================================================

// 1. Health Check
app.get('/api/health', async (req: Request, res: Response) => {
    let dbStatus = 'disconnected';
    const state = mongoose.connection.readyState;
    const states: { [key: number]: string } = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
        99: 'uninitialized',
    };

    // Retry connection if completely disconnected
    if (state === 0 || state === 99) {
        console.log('🔄 Health check found DB disconnected. Retrying...');
        connectDB(); // Fire and forget (don't await to avoid blocking)
        dbStatus = 'retrying';
    } else {
        dbStatus = states[state] || 'unknown';
    }

    const maskedURI = MONGO_URI.replace(/:([^:@]+)@/, ':****@');

    res.json({
        status: 'ok',
        message: 'Server is running',
        database: dbStatus,
        readyState: state, // 0=disconnected, 1=connected, 2=connecting
        lastError: mongoConnectionError,
        mongoUriUsed: maskedURI // Verify if user updated the Env Var correctly
    });
});

// 1.5 Debug Connection Endpoint
import dns from 'dns';
import net from 'net';
import { promisify } from 'util';

app.get('/api/debug-connection', async (req: Request, res: Response) => {
    const host = 'ac-63lt4u9-shard-00-00.fxdecqe.mongodb.net';
    const port = 27017;
    const results: any = {
        dns: null,
        tcp: null,
        message: ''
    };

    try {
        // 1. Test DNS
        try {
            const lookup = promisify(dns.lookup);
            const address = await lookup(host);
            results.dns = { success: true, address };
        } catch (err: any) {
            results.dns = { success: false, error: err.message };
        }

        // 2. Test TCP
        try {
            await new Promise<void>((resolve, reject) => {
                const socket = new net.Socket();
                socket.setTimeout(3000); // 3s timeout
                socket.on('connect', () => {
                    socket.end();
                    resolve();
                });
                socket.on('timeout', () => {
                    socket.destroy();
                    reject(new Error('Connection timed out'));
                });
                socket.on('error', (err) => {
                    socket.destroy();
                    reject(err);
                });
                socket.connect(port, host);
            });
            results.tcp = { success: true, message: 'Connected successfully' };
        } catch (err: any) {
            results.tcp = { success: false, error: err.message };
        }

        // 3. Test Mongoose (Full Connection)
        try {
            // Use createConnection to test a separate connection instance
            const maskedURI = MONGO_URI.replace(/:([^:@]+)@/, ':****@');
            const conn = mongoose.createConnection(MONGO_URI, { serverSelectionTimeoutMS: 5000 });

            await new Promise<void>((resolve, reject) => {
                conn.on('connected', () => {
                    conn.close();
                    resolve();
                });
                conn.on('error', (err) => {
                    reject(err);
                });
                // Timeout fallback if event doesn't fire
                setTimeout(() => reject(new Error('Mongoose connection timeout in debug')), 6000);
            });
            results.mongoose = { success: true, message: 'Mongoose connected successfully' };
        } catch (err: any) {
            results.mongoose = {
                success: false,
                error: err.message,
                name: err.name,
                reason: err.reason
            };
        }

        results.message = 'Diagnostics complete';
        res.json(results);

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Register Endpoint
app.post('/api/register', async (req: Request, res: Response) => {
    try {
        const { username, email, password, firstName, lastName, phone, companyName, address1, city, zip, state, country, vatId } = req.body;

        // Basic Validation
        if (!username || !email || !password) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [{ email: email }, { username: username }]
        });

        if (existingUser) {
            return res.status(409).json({ success: false, message: 'User with this email or username already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            companyName,
            address: address1, // Mapping address1 to address matches Schema
            city,
            zip,
            country,
            vatId,
            role: 'partner'
        });

        await newUser.save();

        console.log(`👤 New User Registered: ${email}`);

        // Generate Token
        // Fixed: Use newUser properties directly
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Send Response
        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            },
            token
        });

    } catch (error) {
        console.error('Registration Error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 3. Login Endpoint
app.post('/api/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Find user
        const user = await User.findOne({
            $or: [{ email: email }, { username: email }] // Allow login by email or username
        });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password || '');

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        console.log(`🔓 User Logged In: ${user.email}`);

        // Generate Token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        return res.json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });

    } catch (error) {
        console.error('Login Error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 4. Get All Users (Debug/Admin only)
app.get('/api/users', async (req: Request, res: Response) => {
    try {
        const users = await User.find({}, '-password'); // Exclude password from result
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users' });
    }
});

// =============================================================================
// SERVER SHUTDOWN
// =============================================================================
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// =============================================================================
// START SERVER
// =============================================================================

const startServer = async () => {
    // Initialize test user
    // Initialize test user - REMOVED (Use MongoDB seed script if needed)

    app.listen(PORT, () => {
        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('  🚀 NetVoya Backend Server');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`  📡 Server:    http://localhost:${PORT}`);
        console.log(`  📡 API:       http://localhost:${PORT}/api`);
        console.log(`  💚 Health:    http://localhost:${PORT}/api/health`);
        console.log('');
        console.log('  Available Endpoints:');
        console.log('  ├─ POST /api/register  - User registration');
        console.log('  ├─ POST /api/login     - User authentication');
        console.log('  └─ GET  /api/users     - List users (debug)');
        console.log('═══════════════════════════════════════════════════════');
        console.log('');
    });
};

// Export app for Vercel
export default app;

// Only start server if NOT running in Vercel environment
if (!process.env.VERCEL) {
    startServer();
}

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
import EsimProductMapping from './models/EsimProductMapping.js';
import InventoryBucket from './models/InventoryBucket.js';
import EsimProfile from './models/EsimProfile.js';
import esimVendorService from './services/esimVendorService.js';

// Prioritize the MongoDB integration's variable, fallback to manual MONGO_URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

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
            maxPoolSize: 10,           // Maximum connections in pool
            minPoolSize: 2,            // Minimum connections to maintain
            serverSelectionTimeoutMS: 10000,  // Reduced from 30s
            socketTimeoutMS: 45000,    // Socket timeout
            family: 4,                 // Force IPv4 (prevents IPv6 issues)
            retryWrites: true,         // Auto-retry failed writes
            w: 'majority'              // Write concern for data safety
        } as any);

        mongoose.connection.on('connected', () => {
            console.log('✅ MongoDB Connected - Pool Ready');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB Error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️ MongoDB Disconnected - Attempting Reconnection...');
        });

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

// Request Logger & Security Audit
app.use((req: Request, res: Response, next: NextFunction) => {
    // Log authentication attempts
    if (req.path === '/api/auth/login' || req.path === '/api/login') {
        console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            event: 'LOGIN_ATTEMPT',
            ip: req.headers['x-forwarded-for'] || req.ip,
            origin: req.get('origin'),
            userAgent: req.get('user-agent')
        }));
    }

    // General Access Log
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

// 5. Get eSIM Packages from Mapping Table
// Updated to handle role-based filtering (Draft vs Live)
app.get('/api/packages', async (req: Request, res: Response) => {
    try {
        const isAdmin = req.query.admin === 'true';
        const query = isAdmin ? {} : { is_live: true };

        const packages = await EsimProductMapping.find(query).sort({ region: 1, data_limit_gb: 1 });
        res.json({
            success: true,
            count: packages.length,
            packages
        });
    } catch (error: any) {
        console.error('Error fetching packages:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching packages' });
    }
});

// 6. Fetch Vendor Balance
app.get('/api/vendor/balance', async (_req: Request, res: Response) => {
    try {
        const balance = await esimVendorService.getBalance();
        res.json({ success: true, balance });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7. Toggle Package Live Status
app.patch('/api/packages/:id/status', async (req: Request, res: Response) => {
    try {
        const { is_live } = req.body;
        const pkg = await EsimProductMapping.findByIdAndUpdate(req.params.id, { is_live }, { new: true });
        res.json({ success: true, package: pkg });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 8. Update Retail Price
app.patch('/api/packages/:id/price', async (req: Request, res: Response) => {
    try {
        const { retail_price } = req.body;
        const pkg = await EsimProductMapping.findByIdAndUpdate(req.params.id, { retail_price }, { new: true });
        res.json({ success: true, package: pkg });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 9. Trigger Vendor Sync (Admin only)
app.post('/api/vendor/sync', async (_req: Request, res: Response) => {
    try {
        console.log('🔄 Manual sync triggered...');
        const vendorPackages = await esimVendorService.getPackages();

        for (const pkg of vendorPackages) {
            await EsimProductMapping.findOneAndUpdate(
                { vendor_package_id: pkg.id },
                {
                    $set: {
                        wholesale_cost: pkg.price,
                        name: pkg.name,
                        region: pkg.region,
                        data_limit_gb: pkg.data_limit_gb,
                        duration_days: pkg.duration_days,
                        last_sync: new Date()
                    },
                    $setOnInsert: {
                        retail_price: Math.ceil(pkg.price * 1.5),
                        is_live: false // New synced packages are DRAFT
                    }
                },
                { upsert: true, new: true }
            );
        }

        res.json({ success: true, message: 'Sync completed. New packages added as DRAFT.' });
    } catch (error: any) {
        console.error('Sync Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 10. Vendor Auth Test (Proxies to vendor login)
app.post('/api/vendor/login', async (_req: Request, res: Response) => {
    try {
        const token = await esimVendorService.login();
        res.json({ success: true, token });
    } catch (error: any) {
        res.status(401).json({ success: false, message: error.message });
    }
});

// 11. Purchase eSIM (with balance check)
app.post('/api/orders/esim', async (_req: Request, res: Response) => {
    try {
        const balance = await esimVendorService.getBalance();

        if (balance <= 0) {
            return res.status(503).json({
                success: false,
                code: 'VND_NO_BALANCE',
                message: 'Service Temporarily Unavailable. Please contact support.'
            });
        }

        // Proceed with order...
        res.json({ success: true, message: 'Order simulation successful.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 12. Get Partner Inventory (Buckets)
app.get('/api/inventory', async (req: Request, res: Response) => {
    try {
        // In a real app, this would be filtered by the logged-in user's ID from JWT
        // For demo, we'll return all buckets if a partner_id is provided or just all
        const partner_id = req.query.partner_id;
        const query = partner_id ? { partner_id } : {};
        const buckets = await InventoryBucket.find(query);
        res.json({ success: true, buckets });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 13. Assign eSIM from Bucket
app.post('/api/inventory/:bucketId/assign', async (req: Request, res: Response) => {
    try {
        const { bucketId } = req.params;
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }

        // Find an available profile in this bucket
        const profile = await EsimProfile.findOneAndUpdate(
            { bucket_id: bucketId, status: 'Available' },
            {
                status: 'Assigned',
                assigned_to_name: name,
                assigned_to_email: email,
                assignment_date: new Date()
            },
            { new: true }
        );

        if (!profile) {
            return res.status(404).json({ success: false, message: 'No available eSIMs in this bucket.' });
        }

        // Update bucket counts
        await InventoryBucket.findByIdAndUpdate(bucketId, {
            $inc: { assigned_count: 1, available_count: -1 }
        });

        // Mock sending email
        console.log(`📧 Sending automated email to ${email} with QR Code for ICCID: ${profile.iccid}`);

        res.json({
            success: true,
            message: `Successfully assigned eSIM to ${name}.`,
            profile
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 14. Bulk Download QR Codes (Mock)
app.get('/api/inventory/:bucketId/download', async (req: Request, res: Response) => {
    try {
        const { bucketId } = req.params;
        const bucket = await InventoryBucket.findById(bucketId);

        if (!bucket) {
            return res.status(404).json({ success: false, message: 'Bucket not found.' });
        }

        // Simulating zip generation
        res.json({
            success: true,
            message: `Pre-generating ZIP for ${bucket.package_name}...`,
            download_url: `/api/mock-download/${bucketId}.zip`
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 15. Seed Test Inventory (Internal Tool)
app.post('/api/test/seed-inventory', async (req: Request, res: Response) => {
    try {
        const { partnerId } = req.body;
        if (!partnerId) return res.status(400).send('partnerId required');

        const packages = await EsimProductMapping.find({ is_live: true });

        for (const pkg of packages) {
            const bucket = await InventoryBucket.create({
                partner_id: partnerId,
                package_id: pkg._id,
                package_name: pkg.name,
                region: pkg.region,
                data_limit_gb: pkg.data_limit_gb,
                duration_days: pkg.duration_days,
                total_purchased: 50,
                assigned_count: 0,
                available_count: 50
            });

            // Create 50 profiles for this bucket
            const profiles = [];
            for (let i = 0; i < 50; i++) {
                profiles.push({
                    bucket_id: bucket._id,
                    iccid: `89000${Math.random().toString().slice(2, 12)}`,
                    activation_code: `ACT-${Math.random().toString(36).substring(7).toUpperCase()}`,
                    qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=NetVoya-eSIM-Test',
                    status: 'Available'
                });
            }
            await EsimProfile.insertMany(profiles);
        }

        res.json({ success: true, message: 'Seeded inventory for packages.' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
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
// START SERVER (Forced Redeploy 2026-01-14 20:46)
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

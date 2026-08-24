/**
 * NetVoya Backend Server
 * Express API for user registration and authentication
 */

import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcryptjs from 'bcryptjs';
const bcrypt = (bcryptjs as any).default || bcryptjs;
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
import Notification from './models/Notification.js';
import Order from './models/Order.js';
import esimVendorService from './services/esimVendorService.js';
import emailService from './services/emailService.js';
import alertService from './services/alertService.js';

const URIS_TO_TRY = Array.from(new Set([
    process.env.MONGO_URI,
    process.env.MONGODB_URI
].filter(Boolean))) as string[];

if (URIS_TO_TRY.length === 0) {
    console.warn("⚠️  WARNING: MONGO_URI is not defined in environment.");
}

// Global variable to store connection error
let mongoConnectionError: string | null = null;

const connectDB = async () => {
    let lastErr: string | null = null;
    for (const uri of URIS_TO_TRY) {
        try {
            const maskedURI = uri.replace(/:([^:@]+)@/, ':****@');
            console.log(`📡 Attempting to connect to: ${maskedURI}`);

            await mongoose.connect(uri, {
                dbName: 'netvoya',
                serverSelectionTimeoutMS: 4000,
                retryWrites: true,
                w: 'majority'
            } as any);

            console.log('✅ Connected to MongoDB Atlas');
            mongoConnectionError = null; // Clear error on success
            return;
        } catch (err: any) {
            console.error(`❌ Connection failed for URI (${uri.substring(0, 25)}...):`, err.message);
            lastErr = err.message;
        }
    }
    mongoConnectionError = lastErr;
};
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
 * Ensure MongoDB connection is alive before database operations.
 * Critical for Vercel serverless where connections can become stale.
 */
const ensureDbConnected = async (): Promise<void> => {
    if (mongoose.connection.readyState === 1) return;
    await connectDB();
};

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
        await ensureDbConnected();
        const { username, email, password, firstName, lastName, phone, companyName, address1, city, zip, state, country, vatId, role, referredByAgency } = req.body;

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
        const hashedPassword = bcrypt.hashSync(password, 10);

        // Determine user role (partner, client, admin)
        const userRole = (role === 'client' || role === 'admin') ? role : 'partner';

        // Determine affiliate code & API key for partner
        const affiliateCode = req.body.affiliateCode || `nvref_${crypto.randomBytes(6).toString('hex')}`;
        const apiKey = `nv_live_${crypto.randomBytes(16).toString('hex')}`;

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
            role: userRole,
            affiliateCode,
            apiKey,
            referredByAgency: referredByAgency || undefined
        });

        await newUser.save();

        console.log(`👤 New User Registered (${userRole}): ${email}`);

        // Generate Token
        const token = jwt.sign(
            { id: newUser._id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Safe Welcome Notification Creation
        try {
            await Notification.create({
                userId: newUser._id,
                title: 'Welcome to Netvoya!',
                message: `Hi ${firstName || username}, we're thrilled to have you as a partner!`,
                type: 'info'
            });
        } catch (notifErr: any) {
            console.warn('⚠️ Welcome notification creation skipped:', notifErr.message);
        }

        // Send Response
        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newUser.email,
                role: newUser.role,
                firstName: newUser.firstName,
                companyName: newUser.companyName
            },
            token
        });

    } catch (error: any) {
        console.error('Registration Error:', error);
        return res.status(500).json({ success: false, message: error?.message || 'Internal server error' });
    }
});

// 3. Login Endpoint
app.post('/api/login', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
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
        const isMatch = bcrypt.compareSync(password, user.password || '');

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
                role: user.role,
                firstName: user.firstName,
                companyName: user.companyName,
                requiresPasswordChange: user.requiresPasswordChange || false
            },
            token
        });

    } catch (error: any) {
        console.error('Login Error:', error);
        return res.status(500).json({ success: false, message: error?.message || 'Internal server error' });
    }
});

// 4. Get All Users (Debug/Admin only)
app.get('/api/users', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
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
        await ensureDbConnected();
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

// 5b. Public Client Portal Packages - returns ALL packages (no is_live filter)
// Used exclusively by the affiliate client portal so clients see every country
app.get('/api/client-packages', async (_req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const packages = await EsimProductMapping.find({}).sort({ region: 1, data_limit_gb: 1 });
        res.json({
            success: true,
            count: packages.length,
            packages
        });
    } catch (error: any) {
        console.error('Error fetching client packages:', error.message);
        res.status(500).json({ success: false, message: 'Error fetching packages' });
    }
});


app.get('/api/vendor/balance', async (_req: Request, res: Response) => {
    try {
        const balance = await esimVendorService.getBalance();

        // Automated Alerting: check if vendor balance <= $20
        alertService.checkVendorBalanceAlert(balance).catch(err => {
            console.error('⚠️ Error during vendor balance alert check:', err.message);
        });

        res.json({ success: true, balance });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7. Toggle Package Live Status
app.patch('/api/packages/:id/status', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { is_live } = req.body;
        const pkg = await EsimProductMapping.findByIdAndUpdate(req.params.id, { is_live }, { new: true });
        res.json({ success: true, package: pkg });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7.5 Activate ALL Packages (Set all to Live)
app.post('/api/packages/activate-all', async (_req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const result = await EsimProductMapping.updateMany({}, { $set: { is_live: true } });
        res.json({ success: true, message: `Activated ${result.modifiedCount} packages.`, modifiedCount: result.modifiedCount });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7.6 Seed Country Packages (Admin tool)
app.post('/api/packages/seed-countries', async (_req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        console.log('🌍 Seeding country packages...');

        const packages = [
            // Egypt
            { name: "Egypt 1GB", region: "Egypt", data_limit_gb: 1, duration_days: 30, retail_price: 5 },
            { name: "Egypt 3GB", region: "Egypt", data_limit_gb: 3, duration_days: 30, retail_price: 14 },
            { name: "Egypt 5GB", region: "Egypt", data_limit_gb: 5, duration_days: 30, retail_price: 22.5 },
            { name: "Egypt 10GB", region: "Egypt", data_limit_gb: 10, duration_days: 30, retail_price: 38 },
            { name: "Egypt 20GB", region: "Egypt", data_limit_gb: 20, duration_days: 30, retail_price: 48.5 },

            // Italy
            { name: "Italy 1GB", region: "Italy", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
            { name: "Italy 3GB", region: "Italy", data_limit_gb: 3, duration_days: 30, retail_price: 9.5 },
            { name: "Italy 5GB", region: "Italy", data_limit_gb: 5, duration_days: 30, retail_price: 14 },
            { name: "Italy 10GB", region: "Italy", data_limit_gb: 10, duration_days: 30, retail_price: 23.5 },
            { name: "Italy 20GB", region: "Italy", data_limit_gb: 20, duration_days: 30, retail_price: 32.5 },

            // Jordan
            { name: "Jordan 1GB", region: "Jordan", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
            { name: "Jordan 3GB", region: "Jordan", data_limit_gb: 3, duration_days: 30, retail_price: 11.5 },
            { name: "Jordan 5GB", region: "Jordan", data_limit_gb: 5, duration_days: 30, retail_price: 17.5 },
            { name: "Jordan 10GB", region: "Jordan", data_limit_gb: 10, duration_days: 30, retail_price: 29.5 },
            { name: "Jordan 20GB", region: "Jordan", data_limit_gb: 20, duration_days: 30, retail_price: 48.5 },

            // KSA: Hajj Package
            { name: "KSA: Hajj 1GB", region: "Saudi Arabia", data_limit_gb: 1, duration_days: 30, retail_price: 7 },
            { name: "KSA: Hajj 2GB", region: "Saudi Arabia", data_limit_gb: 2, duration_days: 30, retail_price: 14.99 },
            { name: "KSA: Hajj 3GB", region: "Saudi Arabia", data_limit_gb: 3, duration_days: 30, retail_price: 19.99 },

            // Morocco
            { name: "Morocco 1GB", region: "Morocco", data_limit_gb: 1, duration_days: 30, retail_price: 6 },
            { name: "Morocco 3GB", region: "Morocco", data_limit_gb: 3, duration_days: 30, retail_price: 17.5 },
            { name: "Morocco 5GB", region: "Morocco", data_limit_gb: 5, duration_days: 30, retail_price: 27.5 },
            { name: "Morocco 10GB", region: "Morocco", data_limit_gb: 10, duration_days: 30, retail_price: 41.5 },
            { name: "Morocco 20GB", region: "Morocco", data_limit_gb: 20, duration_days: 30, retail_price: 59.5 },

            // Oman
            { name: "Oman 1GB", region: "Oman", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
            { name: "Oman 3GB", region: "Oman", data_limit_gb: 3, duration_days: 30, retail_price: 9 },
            { name: "Oman 5GB", region: "Oman", data_limit_gb: 5, duration_days: 30, retail_price: 13.5 },
            { name: "Oman 10GB", region: "Oman", data_limit_gb: 10, duration_days: 30, retail_price: 23.5 },
            { name: "Oman 20GB", region: "Oman", data_limit_gb: 20, duration_days: 30, retail_price: 37.5 },

            // Tunisia
            { name: "Tunisia 1GB", region: "Tunisia", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
            { name: "Tunisia 3GB", region: "Tunisia", data_limit_gb: 3, duration_days: 30, retail_price: 8 },
            { name: "Tunisia 5GB", region: "Tunisia", data_limit_gb: 5, duration_days: 30, retail_price: 11.5 },
            { name: "Tunisia 10GB", region: "Tunisia", data_limit_gb: 10, duration_days: 30, retail_price: 19.5 },
            { name: "Tunisia 20GB", region: "Tunisia", data_limit_gb: 20, duration_days: 30, retail_price: 31 },

            // Turkey
            { name: "Turkey 1GB", region: "Turkey", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
            { name: "Turkey 3GB", region: "Turkey", data_limit_gb: 3, duration_days: 30, retail_price: 7.5 },
            { name: "Turkey 5GB", region: "Turkey", data_limit_gb: 5, duration_days: 30, retail_price: 11.5 },
            { name: "Turkey 10GB", region: "Turkey", data_limit_gb: 10, duration_days: 30, retail_price: 17.5 },
            { name: "Turkey 20GB", region: "Turkey", data_limit_gb: 20, duration_days: 30, retail_price: 25.5 },

            // United Arab Emirates
            { name: "UAE 1GB", region: "United Arab Emirates", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
            { name: "UAE 3GB", region: "United Arab Emirates", data_limit_gb: 3, duration_days: 30, retail_price: 8.5 },
            { name: "UAE 5GB", region: "United Arab Emirates", data_limit_gb: 5, duration_days: 30, retail_price: 11.5 },
            { name: "UAE 10GB", region: "United Arab Emirates", data_limit_gb: 10, duration_days: 30, retail_price: 19.5 },
            { name: "UAE 20GB", region: "United Arab Emirates", data_limit_gb: 20, duration_days: 30, retail_price: 33.5 },

            // United Kingdom
            { name: "UK 1GB", region: "United Kingdom", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
            { name: "UK 3GB", region: "United Kingdom", data_limit_gb: 3, duration_days: 30, retail_price: 8.5 },
            { name: "UK 5GB", region: "United Kingdom", data_limit_gb: 5, duration_days: 30, retail_price: 14.5 },
            { name: "UK 10GB", region: "United Kingdom", data_limit_gb: 10, duration_days: 30, retail_price: 22 },
            { name: "UK 20GB", region: "United Kingdom", data_limit_gb: 20, duration_days: 30, retail_price: 35.5 },
        ];

        let created = 0;
        for (const pkg of packages) {
            const vendor_id = `pkg_${pkg.region.toLowerCase().replace(/[^a-z]/g, '')}_${pkg.data_limit_gb}gb`;
            const wholesale_cost = Math.round(pkg.retail_price * 0.6 * 100) / 100;

            await EsimProductMapping.findOneAndUpdate(
                { name: pkg.name },
                {
                    $set: {
                        vendor_package_id: vendor_id,
                        name: pkg.name,
                        region: pkg.region,
                        data_limit_gb: pkg.data_limit_gb,
                        duration_days: pkg.duration_days,
                        retail_price: pkg.retail_price,
                        wholesale_cost: wholesale_cost,
                        is_live: true,
                        last_sync: new Date()
                    }
                },
                { upsert: true, new: true }
            );
            created++;
        }

        const total = await EsimProductMapping.countDocuments();
        res.json({
            success: true,
            message: `Seeded ${created} country packages.`,
            totalPackages: total
        });
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
        console.log(`📦 Fetched ${vendorPackages.length} packages from vendor`);

        let updated = 0;
        let inserted = 0;

        for (const pkg of vendorPackages) {
            // Extract region from package name (e.g., "eSimCard 1GB Europe" → "Europe")
            // or fallback to 'Global'
            const nameParts = (pkg.name || '').split(' ');
            const region = nameParts.length > 0 ? nameParts[nameParts.length - 1] : 'Global';
            const price = typeof pkg.price === 'string' ? parseFloat(pkg.price) : (pkg.price || 0);

            // 1. Try to find by ID
            let existing = await EsimProductMapping.findOne({ vendor_package_id: pkg.id });

            // 2. Fallback: Try to find by Name (to merge seeded data)
            if (!existing) {
                existing = await EsimProductMapping.findOne({ name: pkg.name });
                if (existing) {
                    console.log(`🔗 Merging seeded package '${pkg.name}' (Old ID: ${existing.vendor_package_id}) -> New ID: ${pkg.id}`);
                    existing.vendor_package_id = pkg.id;
                }
            }

            if (existing) {
                existing.wholesale_cost = price;
                existing.name = pkg.name;
                existing.region = region;
                existing.data_limit_gb = pkg.data_quantity;
                existing.duration_days = pkg.package_validity;
                existing.last_sync = new Date();
                await existing.save();
                updated++;
            } else {
                await EsimProductMapping.create({
                    vendor_package_id: pkg.id,
                    retail_price: Number((price * 1.5).toFixed(2)),
                    wholesale_cost: price,
                    name: pkg.name,
                    region: region,
                    data_limit_gb: pkg.data_quantity,
                    duration_days: pkg.package_validity,
                    is_live: false, // New synced packages are DRAFT
                    last_sync: new Date()
                });
                inserted++;
            }
        }

        res.json({
            success: true,
            message: `Sync completed. Updated: ${updated}, Inserted: ${inserted}.`,
            stats: { updated, inserted }
        });
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

        // Automated Alerting: check if vendor balance <= $20
        alertService.checkVendorBalanceAlert(balance).catch(err => {
            console.error('⚠️ Error during checkout balance alert check:', err.message);
        });

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

// 11.1 Admin: Reset Demo Data (Cleanup)
app.get('/api/admin/reset-demo', async (_req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        console.log('🧹 Resetting Demo Data...');
        const DEMO_ICCIDS = ['8910300000049564025', '8910300000049564873'];
        const results = [];

        for (const iccid of DEMO_ICCIDS) {
            const profile = await EsimProfile.findOne({ iccid });
            if (!profile) {
                results.push(`ICCID ${iccid}: Not found (Clean)`);
                continue;
            }

            // Update Bucket
            const bucket = await InventoryBucket.findById(profile.bucket_id);
            if (bucket) {
                bucket.total_purchased = Math.max(0, bucket.total_purchased - 1);
                if (profile.status === 'Available') {
                    bucket.available_count = Math.max(0, bucket.available_count - 1);
                } else if (profile.status === 'Assigned') {
                    bucket.assigned_count = Math.max(0, bucket.assigned_count - 1);
                }
                await bucket.save();
            }

            // Delete Profile
            await EsimProfile.deleteOne({ _id: profile._id });
            results.push(`ICCID ${iccid}: Deleted and counts updated.`);
        }

        res.json({ success: true, message: 'Demo data reset successfully.', logs: results });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11.5.1 Admin: Verify ICCID
app.get('/api/admin/verify-iccid/:iccid', async (req: Request, res: Response) => {
    try {
        const { iccid } = req.params;
        console.log(`🔍 Verifying ICCID: ${iccid}...`);

        const details = await esimVendorService.getEsimDetailsByIccid(iccid);

        // Find matching local package if possible
        // Based on "1GB Data For 7Day in Egypt" logic
        const packages = await EsimProductMapping.find({ is_live: true });

        res.json({
            success: true,
            details,
            // We'll let the frontend handle the fuzzy matching or 
            // return a suggested packageId based on name/region matching
        });
    } catch (error: any) {
        res.status(404).json({ success: false, message: error.message });
    }
});

// 11.5 Admin: Get All Profiles
app.get('/api/admin/profiles', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const partner_id = req.query.partnerId as string;

        let query: any = {};

        if (partner_id) {
            // Find buckets for this partner
            const buckets = await InventoryBucket.find({ partner_id });
            const bucketIds = buckets.map(b => b._id);
            query.bucket_id = { $in: bucketIds };
        }

        const profiles = await EsimProfile.find(query).sort({ createdAt: -1 });

        res.json({ success: true, profiles });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11.5.5 Admin: Get All Clients (Partners) with aggregated stats
app.get('/api/admin/clients', async (_req: Request, res: Response) => {
    try {
        await ensureDbConnected();

        // 1. Get all partner users
        const partners = await User.find({ role: 'partner' }, '-password').lean();

        // 2. For each partner, aggregate inventory + revenue
        const clientData = await Promise.all(partners.map(async (partner) => {
            const partnerId = partner._id.toString();

            // Inventory stats (available and assigned come from buckets)
            const buckets = await InventoryBucket.find({ partner_id: partnerId }).lean();
            const assignedEsims = buckets.reduce((sum, b) => sum + b.assigned_count, 0);
            const availableEsims = buckets.reduce((sum, b) => sum + b.available_count, 0);

            // Revenue stats from orders
            const allOrders = await Order.find({ partner_id: partnerId }).lean();
            const completedOrders = allOrders.filter((o: any) => o.status === 'Completed');

            const totalTokensPurchased = completedOrders.reduce((sum, o) => sum + (o.totalTokens || 0), 0);
            const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            const totalOrders = completedOrders.length;
            const lastOrder = completedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

            // API key status
            const hasApiKey = !!partner.apiKey;

            return {
                _id: partner._id,
                companyName: partner.companyName || partner.username,
                contactName: [partner.firstName, partner.lastName].filter(Boolean).join(' ') || partner.username,
                email: partner.email,
                country: partner.country || '—',
                city: partner.city || '—',
                joinedAt: (partner as any).createdAt,
                hasApiKey,
                webhookUrl: partner.webhookUrl || null,
                inventory: {
                    total: buckets.reduce((sum, b) => sum + b.total_purchased, 0),
                    assigned: assignedEsims,
                    available: availableEsims,
                    packageCount: buckets.length,
                },
                revenue: {
                    total: totalRevenue,
                    orderCount: totalOrders,
                    lastOrderAt: lastOrder?.createdAt || null,
                },
                status: totalTokensPurchased > 0 || hasApiKey ? 'Active' : 'Inactive',
            };
        }));

        // Sort: most revenue first
        clientData.sort((a, b) => b.revenue.total - a.revenue.total);

        res.json({ success: true, clients: clientData, total: clientData.length });
    } catch (error: any) {
        console.error('Clients Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11.5.6 Admin: Get Partner Orders for Transaction History
app.get('/api/admin/clients/:id/orders', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const partnerId = req.params.id;

        // Find all orders for this partner, sorted by newest first
        const orders = await Order.find({ partner_id: partnerId })
            .select('_id createdAt totalTokens totalAmount status')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, orders, total: orders.length });
    } catch (error: any) {
        console.error('Client Orders Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11.6 Admin: Manual Issue eSIM
app.post('/api/admin/issue-esim', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { partnerId, packageId, iccid, activationCode, qrCodeUrl } = req.body;

        if (!partnerId || !packageId || !iccid || !activationCode) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        // 1. Get Package Details
        const pkg = await EsimProductMapping.findById(packageId);
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

        // 2. Find or Create InventoryBucket
        let bucket = await InventoryBucket.findOne({ partner_id: partnerId, package_id: packageId });

        if (!bucket) {
            bucket = new InventoryBucket({
                partner_id: partnerId,
                package_id: packageId,
                package_name: pkg.name,
                region: pkg.region,
                data_limit_gb: pkg.data_limit_gb,
                duration_days: pkg.duration_days,
                total_purchased: 0,
                assigned_count: 0,
                available_count: 0
            });
        }

        // 3. Create eSIM Profile linked to this bucket
        const qrUrlFinal = qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${activationCode}`;

        const newProfile = new EsimProfile({
            bucket_id: bucket._id,
            iccid,
            activation_code: activationCode,
            qr_code_url: qrUrlFinal,
            status: 'Available' // Available for the PARTNER to assign
        });
        await newProfile.save();

        // 4. Update Bucket Counts
        bucket.total_purchased += 1;
        bucket.available_count += 1;
        await bucket.save();

        res.json({ success: true, message: 'eSIM issued successfully to partner inventory.', profile: newProfile });

    } catch (error: any) {
        console.error('Issue Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11.7 Admin: Bulk Import eSIMs
app.post('/api/admin/bulk-import', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { partnerId, packageId, esims } = req.body;

        if (!partnerId || !packageId || !esims || !Array.isArray(esims) || esims.length === 0) {
            return res.status(400).json({ success: false, message: 'Missing required fields: partnerId, packageId, and esims array' });
        }

        // 1. Get Package Details
        const pkg = await EsimProductMapping.findById(packageId);
        if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

        // 2. Verify partner exists
        const partner = await User.findById(partnerId);
        if (!partner) return res.status(404).json({ success: false, message: 'Partner not found' });

        // 3. Find or Create InventoryBucket
        let bucket = await InventoryBucket.findOne({ partner_id: partnerId, package_id: packageId });

        if (!bucket) {
            bucket = new InventoryBucket({
                partner_id: partnerId,
                package_id: packageId,
                package_name: pkg.name,
                region: pkg.region,
                data_limit_gb: pkg.data_limit_gb,
                duration_days: pkg.duration_days,
                total_purchased: 0,
                assigned_count: 0,
                available_count: 0
            });
            await bucket.save();
        }

        // 4. Check for existing ICCIDs to avoid duplicates
        const incomingIccids = esims.map((e: any) => e.iccid).filter(Boolean);
        const existingProfiles = await EsimProfile.find({ iccid: { $in: incomingIccids } });
        const existingIccidSet = new Set(existingProfiles.map(p => p.iccid));

        // 5. Build profiles to insert
        const profilesToInsert: any[] = [];
        const skippedIccids: string[] = [];
        const errors: string[] = [];

        for (const esim of esims) {
            const { iccid, smdp_address, matching_id } = esim;

            if (!iccid) {
                errors.push('Row with missing ICCID skipped');
                continue;
            }

            if (existingIccidSet.has(iccid)) {
                skippedIccids.push(iccid);
                continue;
            }

            // Build activation code from smdp_address and matching_id
            const activationCode = (smdp_address && matching_id)
                ? `LPA:1$${smdp_address}$${matching_id}`
                : `LPA:1$unknown$${iccid}`;

            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activationCode)}`;

            profilesToInsert.push({
                bucket_id: bucket._id,
                iccid,
                activation_code: activationCode,
                qr_code_url: qrCodeUrl,
                status: 'Available'
            });
        }

        // 6. Bulk insert
        let importedCount = 0;
        if (profilesToInsert.length > 0) {
            await EsimProfile.insertMany(profilesToInsert);
            importedCount = profilesToInsert.length;

            // 7. Update bucket counts
            bucket.total_purchased += importedCount;
            bucket.available_count += importedCount;
            await bucket.save();
        }

        console.log(`📦 Bulk import: ${importedCount} imported, ${skippedIccids.length} skipped (duplicates), ${errors.length} errors for partner ${partner.companyName || partner.username}`);

        res.json({
            success: true,
            message: `Bulk import complete: ${importedCount} eSIMs imported to ${partner.companyName || partner.username}.`,
            imported: importedCount,
            skipped: skippedIccids.length,
            skippedIccids,
            errors
        });

    } catch (error: any) {
        console.error('Bulk Import Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 12.1 Get Recent Activations (with Status Sync)
app.get('/api/partner/activations', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        // In a real app, filter by partner_id from JWT
        // Get last 5 profiles that are Assigned or Active
        const partner_id = req.query.partner_id;

        let filter: any = {
            status: { $in: ['Assigned', 'Active'] }
        };

        if (partner_id) {
            // Find buckets belonging to this partner
            const buckets = await InventoryBucket.find({ partner_id });
            const bucketIds = buckets.map(b => b._id);
            filter.bucket_id = { $in: bucketIds };
        }

        const recentProfiles = await EsimProfile.find(filter)
            .sort({ updatedAt: -1 })
            .populate('bucket_id', 'package_name region');

        const updatedProfiles: any[] = [];
        const CHUNK_SIZE = 10;
        
        // Sync in chunks to prevent Vercel timeouts and Vendor rate limits
        for (let i = 0; i < recentProfiles.length; i += CHUNK_SIZE) {
            const chunk = recentProfiles.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(chunk.map(async (profile) => {
                try {
                    // Sync status with Vendor (or Mock)
                    const vendorData = await esimVendorService.getEsimDetailsByIccid(profile.iccid);
                    
                    // Convert to plain object so we can attach usage data
                    const profileObj = profile.toObject() as any;

                    if (vendorData && vendorData.status) {
                        let newStatus = vendorData.status === 'Active' ? 'Active' : 'Assigned';

                        // Ensure the token has data usage before remaining Active
                        if (newStatus === 'Active' && vendorData.balance) {
                            const parseVal = (str: string) => {
                                if (!str) return 0;
                                const num = parseFloat(str) || 0;
                                if (str.toUpperCase().includes('GB')) return num * 1024;
                                if (str.toUpperCase().includes('MB')) return num;
                                return num;
                            };

                            const initial = parseVal(vendorData.balance.initial_data);
                            const remaining = parseVal(vendorData.balance.remaining_data);

                            if (initial > 0 && remaining >= initial) {
                                newStatus = 'Assigned';
                            }
                        }

                        if (profile.status !== newStatus) {
                            profile.status = newStatus as any; // Cast to enum
                            await profile.save();
                            profileObj.status = newStatus;
                            console.log(`🔄 Synced status for ${profile.iccid}: ${newStatus}`);
                        }
                    }
                    
                    // Attach usage data from the vendor response so frontend
                    // doesn't need to make a second batch API call
                    // isValidDataStr guards against bogus strings like "null undefined"
                    const isValidDataStr = (s: any) => typeof s === 'string' && s.trim().length > 0 && !s.includes('null') && !s.includes('undefined');
                    if (vendorData && vendorData.balance) {
                        profileObj.usage = {
                            initial_data: isValidDataStr(vendorData.balance.initial_data) ? vendorData.balance.initial_data : null,
                            remaining_data: isValidDataStr(vendorData.balance.remaining_data) ? vendorData.balance.remaining_data : null,
                            expiration_date: vendorData.balance.expiration_date || null
                        };

                        // Automated Alerting: check if eSIM remaining data <= 20%
                        alertService.checkEsimLowDataAlert(profile._id.toString(), vendorData.balance).catch(err => {
                            console.error(`⚠️ Error during activations low-data warning check for ${profile.iccid}:`, err.message);
                        });
                    }
                    
                    return profileObj;
                } catch (err) {
                    console.warn(`⚠️ Failed to sync status for ${profile.iccid}:`, err);
                    return profile.toObject(); // Return stale if sync fails
                }
            }));
            updatedProfiles.push(...chunkResults);

            if (i + CHUNK_SIZE < recentProfiles.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        res.json({ success: true, activations: updatedProfiles });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 12. Get Partner Inventory (Buckets)
app.get('/api/inventory', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
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
        await ensureDbConnected();
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

        // Update bucket counts and get details
        const bucket = await InventoryBucket.findByIdAndUpdate(bucketId, {
            $inc: { assigned_count: 1, available_count: -1 }
        }, { new: true });

        if (!bucket) throw new Error('Bucket not found');

        // Send Email to User
        console.log(`📧 Sending automated email to ${email} with QR Code for ICCID: ${profile.iccid}`);

        const emailResult = await emailService.sendEsimAssignmentEmail({
            email,
            name,
            iccid: profile.iccid,
            activationCode: profile.activation_code,
            qrCodeUrl: profile.qr_code_url,
            packageName: bucket.package_name,
            region: bucket.region,
            dataLimit: bucket.data_limit_gb,
            durationDays: bucket.duration_days
        });

        // Persist email delivery status back to the profile for audit trail
        await EsimProfile.findByIdAndUpdate(profile._id, {
            email_sent: emailResult.success,
            email_sent_at: emailResult.success ? new Date() : undefined,
            email_message_id: emailResult.success ? emailResult.messageId : undefined,
            email_error: emailResult.success ? undefined : emailResult.error,
        });

        if (!emailResult.success) {
            console.warn('⚠️ Assignment saved but email failed:', emailResult.error);
        }

        res.json({
            success: true,
            message: emailResult.success
                ? `Successfully assigned eSIM to ${name} and emailed QR code.`
                : `Assigned to ${name}, but email failed to send.`,
            profile,
            emailSent: emailResult.success
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 13.5 Resend QR Code Email
app.post('/api/esim/:profileId/resend', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { profileId } = req.params;

        const profile = await EsimProfile.findById(profileId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }
        if (!profile.assigned_to_email || !profile.assigned_to_name) {
            return res.status(400).json({ success: false, message: 'Profile has no assigned recipient to resend to.' });
        }

        const bucket = await InventoryBucket.findById(profile.bucket_id);
        if (!bucket) {
            return res.status(404).json({ success: false, message: 'Bucket not found.' });
        }

        console.log(`🔁 Resending QR code email to ${profile.assigned_to_email} for ICCID: ${profile.iccid}`);

        const emailResult = await emailService.sendEsimAssignmentEmail({
            email: profile.assigned_to_email,
            name: profile.assigned_to_name,
            iccid: profile.iccid,
            activationCode: profile.activation_code,
            qrCodeUrl: profile.qr_code_url,
            packageName: bucket.package_name,
            region: bucket.region,
            dataLimit: bucket.data_limit_gb,
            durationDays: bucket.duration_days,
        });

        // Update audit fields
        await EsimProfile.findByIdAndUpdate(profileId, {
            email_sent: emailResult.success,
            email_sent_at: emailResult.success ? new Date() : undefined,
            email_message_id: emailResult.success ? emailResult.messageId : undefined,
            email_error: emailResult.success ? undefined : emailResult.error,
        });

        if (!emailResult.success) {
            return res.status(500).json({ success: false, message: `Resend failed: ${emailResult.error}` });
        }

        res.json({ success: true, message: `QR code resent to ${profile.assigned_to_email}.` });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 13.6 Update Assigned Email
app.put('/api/esim/:profileId/email', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { profileId } = req.params;
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, message: 'New email is required.' });
        }

        const profile = await EsimProfile.findById(profileId);
        if (!profile) {
            return res.status(404).json({ success: false, message: 'Profile not found.' });
        }

        if (profile.status !== 'Assigned') {
            return res.status(400).json({ success: false, message: 'Cannot edit email for active or unassigned profiles.' });
        }

        profile.assigned_to_email = email;
        await profile.save();

        res.json({ success: true, message: 'Assigned email updated successfully.', profile });
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

// 16. Request Inventory (Email Notification)
app.post('/api/request-inventory', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { totalTokens, totalAmount, discountLabel, packages, partnerInfo } = req.body;

        if (!totalTokens || !packages || packages.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid request data' });
        }

        console.log(`📝 Received inventory request for ${totalTokens} tokens ($${totalAmount})`);

        // Resolve partner_id from email if possible
        let partnerId = null;
        if (partnerInfo?.email) {
            const partnerUser = await User.findOne({ email: partnerInfo.email });
            if (partnerUser) partnerId = partnerUser._id;
        }

        // Calculate secure costs and profits based on current EsimProductMapping
        let calculatedTotalCost = 0;
        let calculatedTotalProfit = 0;

        const enrichedPackages = await Promise.all(packages.map(async (pkg: any) => {
            // Find current mapping to get wholesale cost
            const mapping = await EsimProductMapping.findOne({ name: pkg.name, region: pkg.region });
            const wholesaleCost = mapping ? mapping.wholesale_cost : 0;

            const packageCost = wholesaleCost;
            const packageTotalCost = packageCost * pkg.quantity;
            const packageProfit = pkg.total - packageTotalCost; // total is the retail price they paid for this line item

            calculatedTotalCost += packageTotalCost;
            calculatedTotalProfit += packageProfit;

            return {
                ...pkg,
                cost: packageCost,
                totalCost: packageTotalCost,
                profit: packageProfit
            };
        }));

        // Persist Order to database
        const order = await Order.create({
            partner_id: partnerId,
            partner_name: partnerInfo?.name || 'Unknown Partner',
            partner_email: partnerInfo?.email || 'unknown',
            totalTokens,
            totalCost: calculatedTotalCost,
            totalAmount,
            totalProfit: calculatedTotalProfit,
            discountLabel: discountLabel || null,
            packages: enrichedPackages,
            status: 'Pending'
        });

        console.log(`✅ Order ${order._id} saved to database`);

        // Send Email
        const emailResult = await emailService.sendInventoryRequestEmail({
            totalTokens,
            totalAmount,
            discountLabel,
            packages,
            partnerInfo
        });

        if (emailResult.success) {
            res.json({ success: true, message: 'Request submitted and email sent.', orderId: order._id });
        } else {
            console.warn('⚠️ Order saved but email failed:', emailResult.error);
            res.json({ success: true, message: 'Request submitted (email delivery pending).', orderId: order._id });
        }

    } catch (error: any) {
        console.error('Request Inventory Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 16.5 Client Request Inventory (Affiliate B2C Request)
app.post('/api/client-request-inventory', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { totalTokens, totalAmount, discountLabel, packages, clientInfo, agencyInfo } = req.body;

        if (!totalTokens || !packages || packages.length === 0 || !clientInfo?.email) {
            return res.status(400).json({ success: false, message: 'Invalid request data. Email, tokens and packages are required.' });
        }

        console.log(`📝 Received B2C Client request from ${clientInfo.email} for ${totalTokens} tokens ($${totalAmount}) via Agency: ${agencyInfo?.name || 'Direct'}`);

        // Resolve partner agency user by ID, affiliateCode, or email
        let partnerUser = null;
        if (agencyInfo?.id && mongoose.Types.ObjectId.isValid(agencyInfo.id)) {
            partnerUser = await User.findById(agencyInfo.id);
        }
        if (!partnerUser && (agencyInfo?.code || agencyInfo?.id)) {
            const refCode = agencyInfo.code || agencyInfo.id;
            partnerUser = await User.findOne({ affiliateCode: refCode });
        }
        if (!partnerUser && agencyInfo?.email && !agencyInfo.email.includes('@netvoya.partner')) {
            partnerUser = await User.findOne({ email: agencyInfo.email });
        }

        const partnerId = partnerUser ? partnerUser._id : null;
        const resolvedAgencyName = partnerUser ? (partnerUser.companyName || partnerUser.username) : (agencyInfo?.name || 'Affiliate Partner');
        const resolvedAgencyEmail = partnerUser ? partnerUser.email : (agencyInfo?.email || 'unknown');

        // Calculate secure costs and profits based on current EsimProductMapping
        let calculatedTotalCost = 0;
        let calculatedTotalProfit = 0;

        const enrichedPackages = await Promise.all(packages.map(async (pkg: any) => {
            const mapping = await EsimProductMapping.findOne({ name: pkg.name, region: pkg.region });
            const wholesaleCost = mapping ? mapping.wholesale_cost : 0;
            const packageTotalCost = wholesaleCost * pkg.quantity;
            const packageProfit = pkg.total - packageTotalCost;

            calculatedTotalCost += packageTotalCost;
            calculatedTotalProfit += packageProfit;

            return {
                ...pkg,
                cost: wholesaleCost,
                totalCost: packageTotalCost,
                profit: packageProfit
            };
        }));

        // Persist Order to database marked as B2C client request
        const order = await Order.create({
            partner_id: partnerId,
            partner_name: resolvedAgencyName,
            partner_email: resolvedAgencyEmail,
            isClientRequest: true,
            client_name: clientInfo?.name || 'Client',
            client_email: clientInfo.email,
            agency_id: partnerUser ? partnerUser._id.toString() : (agencyInfo?.id || ''),
            agency_name: resolvedAgencyName,
            totalTokens,
            totalCost: calculatedTotalCost,
            totalAmount,
            totalProfit: calculatedTotalProfit,
            discountLabel: discountLabel || 'Affiliate Client Discount',
            packages: enrichedPackages,
            status: 'Pending'
        });

        console.log(`✅ Client Order ${order._id} saved to database`);

        // Send Email Notifications
        // 1. Client Confirmation Email
        const clientEmailResult = await emailService.sendClientConfirmationEmail({
            totalTokens,
            totalAmount,
            discountLabel,
            packages,
            clientInfo,
            agencyInfo
        });

        // 2. Admin Notification Email
        const adminEmailResult = await emailService.sendAdminClientRequestEmail({
            totalTokens,
            totalAmount,
            discountLabel,
            packages,
            clientInfo,
            agencyInfo
        });

        res.json({
            success: true,
            message: 'Request submitted successfully. Confirmation emails sent to client and admin.',
            orderId: order._id,
            clientEmailSent: clientEmailResult.success,
            adminEmailSent: adminEmailResult.success
        });

    } catch (error: any) {
        console.error('Client Request Inventory Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 17. Admin: Get Recent Orders
app.get('/api/admin/recent-orders', async (_req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const mapped = orders.map((order: any) => {
            // Build a plan summary from packages
            const planSummary = order.packages.length === 1
                ? order.packages[0].name
                : `${order.packages[0].name} +${order.packages.length - 1} more`;

            return {
                id: order._id,
                client: order.partner_name,
                plan: planSummary,
                amount: `$${order.totalAmount.toLocaleString()}`,
                status: order.status,
                date: order.createdAt
            };
        });

        res.json({ success: true, orders: mapped });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 18. Admin: Update Order Status
app.patch('/api/admin/orders/:id/status', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { status } = req.body;
        const validStatuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
        }

        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        console.log(`📋 Order ${order._id} status updated to: ${status}`);
        res.json({ success: true, message: `Order status updated to ${status}`, order });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 18.5 Admin: Revenue Analytics
app.get('/api/admin/revenue', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { partner_id } = req.query;

        const query: any = { status: 'Completed' };
        if (partner_id && partner_id !== 'all') {
            query.partner_id = partner_id;
        }

        const orders = await Order.find(query).sort({ createdAt: -1 }).lean();

        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;

        // Process orders and handle backwards compatibility for old orders without native cost tracking
        const processedOrders = orders.map((order: any) => {
            let orderCost = order.totalCost || 0;
            let orderProfit = order.totalProfit || 0;
            const orderRevenue = order.totalAmount || 0;

            // If it's an old order, estimate 20% profit margin and 80% cost
            if (!order.totalCost && orderRevenue > 0) {
                orderProfit = orderRevenue * 0.20;
                orderCost = orderRevenue - orderProfit;
            }

            totalRevenue += orderRevenue;
            totalCost += orderCost;
            totalProfit += orderProfit;

            const planSummary = order.packages?.length === 1
                ? order.packages[0].name
                : `${order.packages?.[0]?.name || 'Auto Plan'} +${(order.packages?.length || 1) - 1} more`;

            return {
                id: order._id,
                client: order.partner_name,
                plan: planSummary,
                amount: orderRevenue,
                cost: orderCost,
                profit: orderProfit,
                date: order.createdAt
            };
        });

        res.json({
            success: true,
            stats: {
                totalRevenue,
                totalCost,
                totalProfit
            },
            orders: processedOrders
        });
    } catch (error: any) {
        console.error('Revenue Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// =============================================================================
// eSIM USAGE TRACKING
// =============================================================================

// 19. Get single eSIM usage by ICCID
app.get('/api/esim/usage/:iccid', async (req: Request, res: Response) => {
    try {
        const { iccid } = req.params;
        const details = await esimVendorService.getEsimDetailsByIccid(iccid);

        res.json({
            success: true,
            usage: {
                iccid,
                status: details.status || 'Unknown',
                initial_data: details.balance?.initial_data || null,
                remaining_data: details.balance?.remaining_data || null,
                expiration_date: details.balance?.expiration_date || null
            }
        });
    } catch (error: any) {
        // Return empty usage instead of error so frontend can degrade gracefully
        res.json({
            success: false,
            usage: { iccid: req.params.iccid, status: 'Unknown', initial_data: null, remaining_data: null, expiration_date: null }
        });
    }
});

// 20. Batch eSIM usage lookup
app.post('/api/esim/usage/batch', async (req: Request, res: Response) => {
    try {
        const { iccids } = req.body;
        if (!iccids || !Array.isArray(iccids) || iccids.length === 0) {
            return res.status(400).json({ success: false, message: 'iccids array required' });
        }

        // Limit to 100 ICCIDs per batch to avoid overloading vendor API too much, process in chunks
        const limited = iccids.slice(0, 100);

        const CHUNK_SIZE = 10;
        const results = [];

        for (let i = 0; i < limited.length; i += CHUNK_SIZE) {
            const chunk = limited.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.allSettled(
                chunk.map(async (iccid: string) => {
                    try {
                        const details = await esimVendorService.getEsimDetailsByIccid(iccid);
                        return {
                            iccid,
                            status: details.status || 'Unknown',
                            initial_data: details.balance?.initial_data || null,
                            remaining_data: details.balance?.remaining_data || null,
                            expiration_date: details.balance?.expiration_date || null
                        };
                    } catch (err: any) {
                        return {
                            iccid,
                            status: 'Unknown',
                            initial_data: null,
                            remaining_data: null,
                            expiration_date: null
                        };
                    }
                })
            );
            results.push(...chunkResults);
            
            // basic delay between chunks to avoid vendor block
            if (i + CHUNK_SIZE < limited.length) {
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }

        const usageMap: Record<string, any> = {};
        const isValidDataStr = (s: any) => typeof s === 'string' && s.trim().length > 0 && !s.includes('null') && !s.includes('undefined');
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                const v = result.value;
                // Only add to usageMap if at least one data field is valid
                // This prevents 'Usage unavailable' from showing for fulfilled-but-empty vendor responses
                const initial_data = isValidDataStr(v.initial_data) ? v.initial_data : null;
                const remaining_data = isValidDataStr(v.remaining_data) ? v.remaining_data : null;
                usageMap[v.iccid] = {
                    ...v,
                    initial_data,
                    remaining_data,
                };

                // Automated Alerting: check if eSIM remaining data <= 20%
                if (initial_data && remaining_data) {
                    alertService.checkEsimLowDataAlert(v.iccid, { initial_data, remaining_data }).catch(err => {
                        console.error(`⚠️ Error during batch low-data warning check for ${v.iccid}:`, err.message);
                    });
                }
            }
        });

        res.json({ success: true, usage: usageMap });
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
// PARTNER SETTINGS (API Keys & Webhooks)
// =============================================================================

import crypto from 'crypto';

// 20. Get Partner Settings
app.get('/api/partner/settings', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const partner_id = req.query.partner_id as string;
        if (!partner_id) return res.status(400).json({ success: false, message: 'partner_id required' });

        let user = null;
        if (mongoose.Types.ObjectId.isValid(partner_id)) {
            user = await User.findById(partner_id);
        }

        // Robust fallback for demo/testing: if no user found, fetch the first partner in the system
        if (!user) {
            user = await User.findOne({ role: 'partner' });
        }

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Mask the API key for display (show first 12 and last 4 chars)
        let maskedKey = '';
        if (user.apiKey) {
            const key = user.apiKey;
            maskedKey = key.substring(0, 12) + '...' + key.substring(key.length - 4);
        }

        // Auto-generate an affiliateCode for the partner if they don't have one yet
        if (!user.affiliateCode) {
            const raw = crypto.randomBytes(6).toString('hex'); // 12 hex chars
            user.affiliateCode = `nvref_${raw}`;
            await user.save();
        }

        res.json({
            success: true,
            settings: {
                apiKey: maskedKey,
                hasApiKey: !!user.apiKey,
                webhookUrl: user.webhookUrl || '',
                affiliateCode: user.affiliateCode,
                agencyName: user.companyName || user.username
            }
        });
    } catch (error: any) {
        console.error('Error in GET /api/partner/settings:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 20b. Regenerate Affiliate Code for Partner
app.post('/api/partner/affiliate/generate', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { partner_id } = req.body;
        if (!partner_id) return res.status(400).json({ success: false, message: 'partner_id required' });

        let user = null;
        if (mongoose.Types.ObjectId.isValid(partner_id)) {
            user = await User.findById(partner_id);
        }

        // Robust fallback for demo/testing:
        if (!user) {
            user = await User.findOne({ role: 'partner' });
        }

        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        if (user.role !== 'partner' && user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Only partners can generate affiliate codes' });
        }

        const raw = crypto.randomBytes(6).toString('hex');
        user.affiliateCode = `nvref_${raw}`;
        await user.save();

        console.log(`🔗 Affiliate code regenerated for partner: ${user.email} → ${user.affiliateCode}`);

        res.json({
            success: true,
            affiliateCode: user.affiliateCode,
            message: 'New affiliate code generated successfully.'
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 20c. Public: Validate an affiliate code (used by client portal on load)
app.get('/api/validate-affiliate/:code', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { code } = req.params;
        if (!code) return res.status(400).json({ success: false, valid: false });

        const partner = await User.findOne({ affiliateCode: code, role: 'partner' });
        if (!partner) {
            return res.status(404).json({ success: false, valid: false, message: 'Invalid or expired affiliate link.' });
        }

        res.json({
            success: true,
            valid: true,
            agencyName: partner.companyName || partner.username,
            agencyId: partner._id
        });
    } catch (error: any) {
        res.status(500).json({ success: false, valid: false, message: error.message });
    }
});

// 21. Generate API Key
app.post('/api/partner/settings/generate-key', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { partner_id } = req.body;
        if (!partner_id) return res.status(400).json({ success: false, message: 'partner_id required' });

        const user = await User.findById(partner_id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Generate a new API key: nv_live_<32 hex chars>
        const rawKey = crypto.randomBytes(32).toString('hex');
        const apiKey = `nv_live_${rawKey}`;

        user.apiKey = apiKey;
        await user.save();

        console.log(`🔑 API Key generated for partner: ${user.email}`);

        // Return the FULL key (only shown once)
        res.json({
            success: true,
            apiKey: apiKey,
            message: 'API key generated. Save it securely — it will only be shown once.'
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 22. Update Webhook URL
app.put('/api/partner/settings/webhook', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { partner_id, webhookUrl } = req.body;
        if (!partner_id) return res.status(400).json({ success: false, message: 'partner_id required' });

        const user = await User.findById(partner_id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        user.webhookUrl = webhookUrl || '';
        await user.save();

        console.log(`🔗 Webhook URL updated for partner: ${user.email}`);

        res.json({
            success: true,
            message: 'Webhook URL saved successfully.',
            webhookUrl: user.webhookUrl
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 23. Get User Notifications
app.get('/api/notifications', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

        const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({ success: true, notifications });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 24. Mark Notification as Read
app.patch('/api/notifications/:id/read', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }

        res.json({ success: true, notification });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 25. Change Password
app.patch('/api/user/change-password', async (req: Request, res: Response) => {
    try {
        await ensureDbConnected();
        const { userId, currentPassword, newPassword } = req.body;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Verify current password
        const isMatch = bcrypt.compareSync(currentPassword, user.password || '');
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect current password' });
        }

        // Hash and save new password
        user.password = bcrypt.hashSync(newPassword, 10);
        user.requiresPasswordChange = false;
        await user.save();

        console.log(`🔐 Password updated for user: ${user.email}`);

        res.json({
            success: true,
            message: 'Password updated successfully'
        });

    } catch (error: any) {
        console.error('Change Password Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// =============================================================================
// VENDOR API PROXY ROUTES (New API Endpoints)
// =============================================================================

// V1. Get Available Countries
app.get('/api/vendor/countries', async (_req: Request, res: Response) => {
    try {
        const countries = await esimVendorService.getCountries();
        res.json({ success: true, countries });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V2. Get Packages by Country
app.get('/api/vendor/countries/:id/packages', async (req: Request, res: Response) => {
    try {
        const countryId = parseInt(req.params.id);
        const packageType = req.query.package_type as string | undefined;
        const data = await esimVendorService.getPackagesByCountry(countryId, packageType);
        res.json({ success: true, ...data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V3. Get Available Continents
app.get('/api/vendor/continents', async (_req: Request, res: Response) => {
    try {
        const continents = await esimVendorService.getContinents();
        res.json({ success: true, continents });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V4. Get Packages by Continent
app.get('/api/vendor/continents/:id/packages', async (req: Request, res: Response) => {
    try {
        const continentId = parseInt(req.params.id);
        const packageType = req.query.package_type as string | undefined;
        const data = await esimVendorService.getPackagesByContinent(continentId, packageType);
        res.json({ success: true, ...data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V5. Get Global Packages
app.get('/api/vendor/packages/global', async (req: Request, res: Response) => {
    try {
        const packageType = (req.query.package_type as string) || 'DATA-ONLY';
        const data = await esimVendorService.getGlobalPackages(packageType);
        res.json({ success: true, ...data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V6. Get Package Details
app.get('/api/vendor/packages/:id', async (req: Request, res: Response) => {
    try {
        const detail = await esimVendorService.getPackageDetail(req.params.id);
        res.json({ success: true, package: detail });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V7. Check Topup Availability
app.post('/api/vendor/can-topup', async (req: Request, res: Response) => {
    try {
        const { imei } = req.body;
        if (!imei) return res.status(400).json({ success: false, message: 'imei required' });
        const available = await esimVendorService.canTopupEsim(imei);
        res.json({ success: true, topup_available: available });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V8. Purchase Package (Data-Only)
app.post('/api/vendor/purchase', async (req: Request, res: Response) => {
    try {
        const { imei, package_type_id } = req.body;
        if (!imei || !package_type_id) return res.status(400).json({ success: false, message: 'imei and package_type_id required' });
        const result = await esimVendorService.purchasePackage(imei, package_type_id);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V9. Purchase Data+Voice+SMS Package
app.post('/api/vendor/purchase/voice-sms', async (req: Request, res: Response) => {
    try {
        const { imei, package_type_id } = req.body;
        if (!imei || !package_type_id) return res.status(400).json({ success: false, message: 'imei and package_type_id required' });
        const result = await esimVendorService.purchaseDataVoiceSmsPackage(imei, package_type_id);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V10. Purchase Package (Async)
app.post('/api/vendor/purchase/async', async (req: Request, res: Response) => {
    try {
        const { imei, package_type_id } = req.body;
        if (!imei || !package_type_id) return res.status(400).json({ success: false, message: 'imei and package_type_id required' });
        const result = await esimVendorService.purchasePackageAsync(imei, package_type_id);
        res.json({ success: true, data: result });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V11. Get My Bundles
app.get('/api/vendor/my-bundles', async (_req: Request, res: Response) => {
    try {
        const data = await esimVendorService.getMyBundles();
        res.json({ success: true, ...data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V12. Get Bundle Detail
app.get('/api/vendor/bundles/:id', async (req: Request, res: Response) => {
    try {
        const data = await esimVendorService.getBundleDetail(req.params.id);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V13. Get My eSIMs
app.get('/api/vendor/my-esims', async (_req: Request, res: Response) => {
    try {
        const data = await esimVendorService.getMyEsims();
        res.json({ success: true, ...data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V14. Get eSIM Detail
app.get('/api/vendor/my-esims/:id', async (req: Request, res: Response) => {
    try {
        const data = await esimVendorService.getEsimDetail(req.params.id);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V15. Get Order Detail
app.get('/api/vendor/orders/:id', async (req: Request, res: Response) => {
    try {
        const orderId = parseInt(req.params.id);
        const data = await esimVendorService.getOrderDetail(orderId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// V16. Get Network Coverages
app.get('/api/vendor/network-coverages', async (_req: Request, res: Response) => {
    try {
        const coverages = await esimVendorService.getNetworkCoverages();
        res.json({ success: true, coverages });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

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

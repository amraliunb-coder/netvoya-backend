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
import emailService from './services/emailService.js';

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
            // Simplified options for better stability
            serverSelectionTimeoutMS: 5000,
            retryWrites: true,
            w: 'majority'
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

// 7.5 Activate ALL Packages (Set all to Live)
app.post('/api/packages/activate-all', async (_req: Request, res: Response) => {
    try {
        const result = await EsimProductMapping.updateMany({}, { $set: { is_live: true } });
        res.json({ success: true, message: `Activated ${result.modifiedCount} packages.`, modifiedCount: result.modifiedCount });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 7.6 Seed Country Packages (Admin tool)
app.post('/api/packages/seed-countries', async (_req: Request, res: Response) => {
    try {
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
            const region = (pkg.coverage && pkg.coverage.length > 0) ? pkg.coverage[0].country_name : 'Global';

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
                existing.wholesale_cost = pkg.price;
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
                    retail_price: Number((pkg.price * 1.5).toFixed(2)),
                    wholesale_cost: pkg.price,
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
        // In real app: verify admin role via middleware
        const profiles = await EsimProfile.find().sort({ createdAt: -1 });

        // Enrich with package name from bucket if possible
        // For performance, we'll just return profiles first. 
        // A robust solution would .populate('bucket_id')

        res.json({ success: true, profiles });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 11.6 Admin: Manual Issue eSIM
app.post('/api/admin/issue-esim', async (req: Request, res: Response) => {
    try {
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

// 16. Request Inventory (Email Notification)
app.post('/api/request-inventory', async (req: Request, res: Response) => {
    try {
        const { totalTokens, totalAmount, discountLabel, packages, partnerInfo } = req.body;

        if (!totalTokens || !packages || packages.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid request data' });
        }

        console.log(`📝 Received inventory request for ${totalTokens} tokens ($${totalAmount})`);

        // Send Email
        const emailResult = await emailService.sendInventoryRequestEmail({
            totalTokens,
            totalAmount,
            discountLabel,
            packages,
            partnerInfo
        });

        if (emailResult.success) {
            res.json({ success: true, message: 'Request submitted and email sent.' });
        } else {
            console.warn('⚠️ Request saved but email failed:', emailResult.error);
            // Still return success to frontend so user flow isn't broken, but log the error
            res.json({ success: true, message: 'Request submitted (email delivery pending).' });
        }

    } catch (error: any) {
        console.error('Request Inventory Error:', error);
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

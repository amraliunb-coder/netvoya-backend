import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

// Use the MongoDB integration's URI
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ No MONGO_URI or MONGODB_URI found in .env');
    process.exit(1);
}

async function seedAdmin() {
    try {
        console.log('📡 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        // Define User schema
        const UserSchema = new mongoose.Schema({
            username: String,
            email: String,
            password: String,
            role: String,
            createdAt: { type: Date, default: Date.now }
        });

        const User = mongoose.model('User', UserSchema);

        // Check if admin exists
        const existingAdmin = await User.findOne({ email: 'admin@netvoya.com' });

        if (existingAdmin) {
            console.log('ℹ️  Admin user already exists');
            await mongoose.connection.close();
            process.exit(0);
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('adminPassword123!', 10);

        const admin = new User({
            username: 'admin',
            email: 'admin@netvoya.com',
            password: hashedPassword,
            role: 'admin'
        });

        await admin.save();

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ Admin User Created Successfully');
        console.log('═══════════════════════════════════════════════════════');
        console.log('📧 Email:    admin@netvoya.com');
        console.log('🔑 Password: adminPassword123!');
        console.log('═══════════════════════════════════════════════════════\n');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedAdmin();

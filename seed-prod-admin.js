import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Use the INTEGRATION'S connection string directly
const MONGODB_URI = "mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority";

async function seedAdminToProduction() {
    try {
        console.log('📡 Connecting to PRODUCTION database (integration)...');
        await mongoose.connect(MONGODB_URI);

        const db = mongoose.connection.db;
        console.log(`✅ Connected to database: ${db.databaseName}\n`);

        const UserSchema = new mongoose.Schema({
            username: String,
            email: String,
            password: String,
            role: String,
            createdAt: { type: Date, default: Date.now }
        });

        const User = mongoose.model('User', UserSchema, 'users');

        // Check existing
        const existing = await User.findOne({ email: 'admin@netvoya.com' });

        if (existing) {
            console.log('ℹ️  Admin already exists. Resetting password...');
            const hashedPassword = await bcrypt.hash('adminPassword123!', 10);
            existing.password = hashedPassword;
            await existing.save();
            console.log('✅ Password RESET');
        } else {
            console.log('Creating new admin user...');
            const hashedPassword = await bcrypt.hash('adminPassword123!', 10);
            const admin = new User({
                username: 'admin',
                email: 'admin@netvoya.com',
                password: hashedPassword,
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Admin CREATED');
        }

        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ Admin User Ready in PRODUCTION Database');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📧 Email:    admin@netvoya.com`);
        console.log(`🔑 Password: adminPassword123!`);
        console.log(`💾 Database: ${db.databaseName}`);
        console.log('═══════════════════════════════════════════════════════\n');

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedAdminToProduction();

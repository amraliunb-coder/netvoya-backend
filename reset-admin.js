import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ No MONGO_URI found');
    process.exit(1);
}

async function resetAdminPassword() {
    try {
        console.log('📡 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        const UserSchema = new mongoose.Schema({
            username: String,
            email: String,
            password: String,
            role: String
        });

        const User = mongoose.model('User', UserSchema);

        // Find admin user
        const admin = await User.findOne({ email: 'admin@netvoya.com' });

        if (!admin) {
            console.log('❌ Admin user not found. Creating new one...');

            const hashedPassword = await bcrypt.hash('adminPassword123!', 10);
            const newAdmin = new User({
                username: 'admin',
                email: 'admin@netvoya.com',
                password: hashedPassword,
                role: 'admin'
            });
            await newAdmin.save();

            console.log('\n✅ Admin user CREATED');
        } else {
            console.log('✅ Admin user found. Resetting password...');

            const hashedPassword = await bcrypt.hash('adminPassword123!', 10);
            admin.password = hashedPassword;
            await admin.save();

            console.log('✅ Password RESET');
        }

        console.log('\n═══════════════════════════════════════════════════════');
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

resetAdminPassword();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const createAdmin = async () => {
    try {
        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            console.error('❌ MONGO_URI is not defined in .env file.');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const adminEmail = 'admin@netvoya.com';
        const adminPassword = 'admin123';

        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
            console.log('⚠️  Admin user already exists.');
            console.log(`   Email: ${adminEmail}`);
            // If we wanted to reset password, we could do it here, but for now just notify.
            console.log('   (Password is unchanged)');
        } else {
            const hashedPassword = await bcrypt.hash(adminPassword, 10);

            const newAdmin = new User({
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                firstName: 'System',
                lastName: 'Admin'
            });

            await newAdmin.save();
            console.log('✅ Admin user created successfully.');
            console.log(`   Email:    ${adminEmail}`);
            console.log(`   Password: ${adminPassword}`);
        }

    } catch (error) {
        console.error('❌ Error creating admin user:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

createAdmin();

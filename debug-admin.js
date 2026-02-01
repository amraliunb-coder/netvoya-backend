import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

async function debugAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to database\n');

        const UserSchema = new mongoose.Schema({
            username: String,
            email: String,
            password: String,
            role: String
        });

        const User = mongoose.model('User', UserSchema);

        // Find all users
        const allUsers = await User.find({});
        console.log(`📊 Total users in database: ${allUsers.length}\n`);

        // Find admin specifically
        const admin = await User.findOne({ email: 'admin@netvoya.com' });

        if (!admin) {
            console.log('❌ Admin user NOT FOUND\n');
        } else {
            console.log('✅ Admin user FOUND:');
            console.log(`   Email: ${admin.email}`);
            console.log(`   Username: ${admin.username}`);
            console.log(`   Role: ${admin.role}`);
            console.log(`   Password Hash: ${admin.password?.substring(0, 20)}...`);

            // Test password comparison
            const testPassword = 'adminPassword123!';
            const isMatch = await bcrypt.compare(testPassword, admin.password);
            console.log(`\n🔐 Password test: ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
        }

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

debugAdmin();

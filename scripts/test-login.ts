import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

const testLogin = async () => {
    try {
        console.log(`Connecting to: ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`);
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const emailTarget = 'Khairy@sahara-egypt.com';
        const password = 'Password@123';

        console.log(`------ Diagnostic for ${emailTarget} ------`);

        // 1. Search with Regex (Case Insensitive)
        const users = await User.find({ email: { $regex: new RegExp(`^${emailTarget}$`, 'i') } });
        console.log(`Found ${users.length} matching users via regex.`);

        if (users.length === 0) {
            console.log("❌ No users found!");
            // List first 5 users to see what's in there
            const allUsers = await User.find().limit(5);
            console.log("Sample users in DB:", allUsers.map(u => u.email));
        }

        for (const user of users) {
            console.log(`\nChecking User: ID=${user._id}, Email=${user.email}, Role=${user.role}`);
            if (!user.password) {
                console.log("❌ Password field is MISSING or empty!");
                continue;
            }
            console.log(`   Password Hash Present: ${user.password.substring(0, 10)}...`);

            try {
                const isMatch = await bcrypt.compare(password, user.password);
                console.log(`   🔑 Password '${password}' Valid? ${isMatch}`);
            } catch (bcryptError) {
                console.error("   ❌ Bcrypt Error:", bcryptError);
            }
        }

    } catch (err) {
        console.error("❌ Global Error:", err);
    } finally {
        await mongoose.connection.close();
    }
};

testLogin();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function flagKhairy() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Search for user Khairy (case insensitive username or email)
        const user = await User.findOne({
            $or: [
                { username: /^khairy$/i },
                { email: /khairy/i }
            ]
        });

        if (user) {
            user.requiresPasswordChange = true;
            await user.save();
            console.log(`✅ User flagged successfully: ${user.username} (${user.email})`);
        } else {
            console.log('❌ User "Khairy" not found in the database.');

            // List all users to help find the right one
            const allUsers = await User.find({}, 'username email');
            console.log('Available users:');
            allUsers.forEach(u => console.log(`- ${u.username} (${u.email})`));
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

flagKhairy();

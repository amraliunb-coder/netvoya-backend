import mongoose from 'mongoose';
import User from '../models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

const normalizeEmail = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        const emailTarget = 'Khairy@sahara-egypt.com';

        const user = await User.findOne({ email: emailTarget });
        if (user) {
            console.log(`Found user: ${user.email}`);
            user.email = user.email.toLowerCase();
            user.username = user.username.toLowerCase(); // Also lowercase username if needed
            await user.save();
            console.log(`✅ Updated to lowercase: ${user.email}, ${user.username}`);
        } else {
            console.log(`User ${emailTarget} not found (maybe already lowercased?)`);
            // Check if lowercase exists
            const lowerHeader = await User.findOne({ email: emailTarget.toLowerCase() });
            if (lowerHeader) {
                console.log(`✅ User already exists as lowercase: ${lowerHeader.email}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
};

normalizeEmail();

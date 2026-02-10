import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

const checkUser = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        const user = await User.findOne({ email: 'Khairy@sahara-egypt.com' });
        if (user) {
            console.log('✅ User Found in DB:');
            console.log({
                id: user._id,
                email: user.email,
                role: user.role,
                username: user.username
            });
        } else {
            console.log('❌ User NOT found!');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
};

checkUser();

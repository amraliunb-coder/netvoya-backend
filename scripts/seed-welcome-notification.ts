import mongoose from 'mongoose';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';

const seedWelcome = async () => {
    try {
        console.log('📡 Connecting to PROD Database...');
        await mongoose.connect(MONGO_URI);

        const email = 'khairy@sahara-egypt.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.error('❌ User not found!');
            return;
        }

        // Check if welcome notification already exists
        const existing = await Notification.findOne({
            userId: user._id,
            title: 'Welcome to Netvoya!'
        });

        if (existing) {
            console.log('ℹ️ Welcome notification already exists for this user.');
        } else {
            await Notification.create({
                userId: user._id,
                title: 'Welcome to Netvoya!',
                message: `Hi Khairy, we're thrilled to have you as a partner! Explore your dashboard to manage eSIMs, view inventory, and integrate our API into your own application.`,
                type: 'info'
            });
            console.log('✅ Welcome notification created for Sahara (Khairy).');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

seedWelcome();

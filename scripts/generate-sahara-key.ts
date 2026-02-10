import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User.js';

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';

const generateKey = async () => {
    try {
        console.log('📡 Connecting to PROD Database...');
        await mongoose.connect(MONGO_URI);

        const email = 'khairy@sahara-egypt.com';
        const user = await User.findOne({ email });

        if (!user) {
            console.error('❌ User not found!');
            return;
        }

        // Generate key
        const rawKey = crypto.randomBytes(32).toString('hex');
        const apiKey = `nv_live_${rawKey}`;

        user.apiKey = apiKey;
        await user.save();

        console.log('✅ API Key generated for Sahara (Khairy):');
        console.log('');
        console.log('='.repeat(80));
        console.log(`  🔑 API KEY: ${apiKey}`);
        console.log('='.repeat(80));
        console.log('');
        console.log('⚠️  Save this key securely. It will NOT be shown in full again.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

generateKey();

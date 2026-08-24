import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';
import User from '../models/User.ts';

dotenv.config();

const bcrypt = (bcryptjs as any).default || bcryptjs;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function seedPartnerBianca() {
    if (!MONGO_URI) {
        console.error('❌ MONGO_URI is missing from environment variables');
        process.exit(1);
    }

    try {
        console.log('📡 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const partnerEmail = 'bianca@wanderwell.club';
        const rawPassword = 'Wanderwell#2026!eSIM';
        const companyName = 'Wanderwell';
        const username = 'bianca';
        const affiliateCode = 'nvref_wanderwell';

        let user = await User.findOne({ email: partnerEmail });

        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        const apiKey = `nv_live_wanderwell_${crypto.randomBytes(16).toString('hex')}`;

        if (user) {
            console.log(`👤 Partner ${partnerEmail} already exists. Updating credentials and affiliate link...`);
            user.password = hashedPassword;
            user.companyName = companyName;
            user.username = username;
            user.role = 'partner';
            user.affiliateCode = affiliateCode;
            if (!user.apiKey) user.apiKey = apiKey;
            await user.save();
            console.log(`✅ Partner ${partnerEmail} updated successfully.`);
        } else {
            console.log(`👤 Creating new partner account for ${partnerEmail}...`);
            user = new User({
                username,
                email: partnerEmail,
                password: hashedPassword,
                companyName,
                firstName: 'Bianca',
                role: 'partner',
                affiliateCode,
                apiKey
            });
            await user.save();
            console.log(`✅ Partner ${partnerEmail} created successfully.`);
        }

        console.log('\n--- PARTNER DETAILS ---');
        console.log(`Email:          ${user.email}`);
        console.log(`Password:       ${rawPassword}`);
        console.log(`Company Name:   ${user.companyName}`);
        console.log(`Role:           ${user.role}`);
        console.log(`Affiliate Code: ${user.affiliateCode}`);
        console.log(`Affiliate Link: https://netvoya.com/?ref=${user.affiliateCode}`);
        console.log(`API Key:        ${user.apiKey}`);

        await mongoose.disconnect();
        console.log('👋 Disconnected from DB');
        process.exit(0);
    } catch (err: any) {
        console.error('❌ Error seeding partner:', err);
        process.exit(1);
    }
}

seedPartnerBianca();

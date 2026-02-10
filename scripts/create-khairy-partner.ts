import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import InventoryBucket from '../models/InventoryBucket.js';
import EsimProfile from '../models/EsimProfile.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

if (!MONGO_URI) {
    console.error("❌ MONGO_URI is missing in .env file");
    process.exit(1);
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const createPartner = async () => {
    await connectDB();

    const email = 'Khairy@sahara-egypt.com';
    const username = 'Khairy';
    const password = 'Password@123'; // Secure password

    try {
        // 1. Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            console.log(`⚠️ User ${email} already exists.`);
            // Update role if needed
            if (user.role !== 'partner') {
                user.role = 'partner';
                await user.save();
                console.log(`Updated role to partner.`);
            }
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = new User({
                username,
                email,
                password: hashedPassword,
                role: 'partner',
                firstName: 'Khairy',
                lastName: 'Partner',
                companyName: 'Sahara Egypt'
            });
            await user.save();
            console.log(`✅ User ${email} created successfully.`);
            console.log(`🔑 Password: ${password}`);
        }

        // 2. Clear any existing data for this partner (InventoryBucket)
        const buckets = await InventoryBucket.find({ partner_id: user._id });
        if (buckets.length > 0) {
            console.log(`🧹 Found ${buckets.length} inventory buckets. Clearing...`);
            const bucketIds = buckets.map(b => b._id);

            // Delete profiles associated with these buckets
            const deleteProfilesResult = await EsimProfile.deleteMany({ bucket_id: { $in: bucketIds } });
            console.log(`   - Deleted ${deleteProfilesResult.deletedCount} eSim profiles.`);

            // Delete buckets
            const deleteBucketsResult = await InventoryBucket.deleteMany({ partner_id: user._id });
            console.log(`   - Deleted ${deleteBucketsResult.deletedCount} inventory buckets.`);
        } else {
            console.log(`✅ No existing inventory data found for this user (Clean state).`);
        }

        console.log('🎉 Partner setup complete!');

    } catch (error) {
        console.error('❌ Error creating partner:', error);
    } finally {
        await mongoose.connection.close();
    }
};

createPartner();

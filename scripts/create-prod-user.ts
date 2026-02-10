import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import InventoryBucket from '../models/InventoryBucket.js';
import EsimProfile from '../models/EsimProfile.js';

// Hardcoded Prod URI provided by user
const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';

const createProdPartner = async () => {
    try {
        console.log('📡 Connecting to PROD Database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB Atlas (Production)');

        const email = 'khairy@sahara-egypt.com'; // Lowercase!
        const username = 'khairy';
        const password = 'Password@123';

        // 1. Check if user exists
        let user = await User.findOne({ email });

        if (user) {
            console.log(`⚠️ User ${email} already exists in PROD.`);
            // Update role if needed
            if (user.role !== 'partner') {
                user.role = 'partner';
                await user.save();
                console.log(`Updated role to partner.`);
            }
            // Reset password just in case
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
            await user.save();
            console.log(`🔑 Password reset to: ${password}`);

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
            console.log(`✅ User ${email} created successfully in PROD.`);
            console.log(`🔑 Password: ${password}`);
        }

        // 2. Clear any existing data for this partner (InventoryBucket)
        // BE CAREFUL IN PROD: Only clear if you are 100% sure. 
        // Since this is a "new" partner request, we want a clean slate.
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
            console.log(`✅ No existing inventory data found (Clean state).`);
        }

        console.log('🎉 PROD Partner setup complete!');

    } catch (error) {
        console.error('❌ Error creating partner:', error);
    } finally {
        await mongoose.connection.close();
    }
};

createProdPartner();


import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EsimProfile from './models/EsimProfile.js';
import InventoryBucket from './models/InventoryBucket.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DEMO_ICCIDS = ['8910300000049564025', '8910300000049564873'];

async function resetDemoData() {
    try {
        console.log('📡 Connecting to DB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        for (const iccid of DEMO_ICCIDS) {
            console.log(`\n🔍 Searching for ICCID: ${iccid}...`);
            const profile = await EsimProfile.findOne({ iccid });

            if (!profile) {
                console.log(`⚠️ Profile not found. Already clean?`);
                continue;
            }

            console.log(`found profile: ${profile._id} (Status: ${profile.status})`);
            const bucket = await InventoryBucket.findById(profile.bucket_id);

            if (bucket) {
                console.log(`📦 Updating Inventory Bucket: ${bucket.package_name} (${bucket._id})`);
                console.log(`   Before: Total=${bucket.total_purchased}, Available=${bucket.available_count}, Assigned=${bucket.assigned_count}`);

                bucket.total_purchased = Math.max(0, bucket.total_purchased - 1);

                if (profile.status === 'Available') {
                    bucket.available_count = Math.max(0, bucket.available_count - 1);
                } else if (profile.status === 'Assigned') {
                    bucket.assigned_count = Math.max(0, bucket.assigned_count - 1);
                }

                await bucket.save();
                console.log(`   After:  Total=${bucket.total_purchased}, Available=${bucket.available_count}, Assigned=${bucket.assigned_count}`);
            } else {
                console.warn(`⚠️ Bucket not found for profile. Skipping bucket update.`);
            }

            await EsimProfile.deleteOne({ _id: profile._id });
            console.log(`🗑️ Deleted profile for ICCID ${iccid}`);
        }

        console.log('\n✅ Demo Reset Complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetDemoData();

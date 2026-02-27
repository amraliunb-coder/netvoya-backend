import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const buckets = await mongoose.connection.collection('inventory_buckets').find({
            assigned_count: { $gt: 0 }
        }).sort({ updatedAt: -1 }).limit(10).toArray();

        console.log(`Found ${buckets.length} buckets with assignments.`);
        for (const b of buckets) {
            console.log(`Bucket: ${b.package_name}, Region: ${b.region}, Assigned: ${b.assigned_count}`);
            // Find one profile from this bucket
            const profile = await mongoose.connection.collection('esim_profiles').findOne({
                bucket_id: b._id,
                status: 'Assigned'
            });
            if (profile) {
                console.log(`  Example ICCID: ${profile.iccid}`);
            }
        }

        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

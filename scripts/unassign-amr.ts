import mongoose, { Schema } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';

const InventoryBucketSchema = new Schema({
    assigned_count: { type: Number, default: 0 },
    available_count: { type: Number, default: 0 },
}, { strict: false });

const EsimProfileSchema = new Schema({
    bucket_id: { type: Schema.Types.ObjectId, ref: 'InventoryBucket' },
    iccid: { type: String, required: true, unique: true },
    status: { type: String, default: 'Available' },
    assigned_to_name: String,
    assigned_to_email: String,
    assignment_date: Date,
}, { strict: false });

const InventoryBucket = mongoose.model('InventoryBucket', InventoryBucketSchema, 'inventory_buckets');
const EsimProfile = mongoose.model('EsimProfile', EsimProfileSchema, 'esim_profiles');

async function unassignAmr() {
    try {
        console.log('📡 Connecting to DB...');
        if (!MONGO_URI) throw new Error('MONGO_URI missing');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const allAssigned = await EsimProfile.find({ status: { $ne: 'Available' } });
        console.log(`There are ${allAssigned.length} total Assigned/Active profiles in DB.`);
        allAssigned.forEach(p => console.log(`- ICCID: ${p.iccid}, Name: "${p.assigned_to_name}", Email: "${p.assigned_to_email}"`));

        const profiles = [];
        for (const p of allAssigned) {
            const email = (p.assigned_to_email || '').toLowerCase();
            const name = (p.assigned_to_name || '').toLowerCase();
            if (email.includes('amr.ali@mrandmrs') || name.includes('amr')) {
                profiles.push(p);
            }
        }

        console.log(`Found ${profiles.length} profiles to unassign.`);

        const bucketCounts: Record<string, number> = {};

        for (const profile of profiles) {
            console.log(`Unassigning profile: ${profile.iccid} (was assigned to ${profile.assigned_to_name || profile.assigned_to_email})`);
            const bucketIdStr = profile.bucket_id.toString();
            bucketCounts[bucketIdStr] = (bucketCounts[bucketIdStr] || 0) + 1;

            await EsimProfile.updateOne(
                { _id: profile._id },
                {
                    $set: { status: 'Available' },
                    $unset: { assigned_to_name: "", assigned_to_email: "", assignment_date: "" }
                }
            );
        }

        for (const [bucketId, count] of Object.entries(bucketCounts)) {
            await InventoryBucket.updateOne(
                { _id: bucketId },
                {
                    $inc: { assigned_count: -count, available_count: count }
                }
            );
            console.log(`Updated bucket ${bucketId} (assigned -${count}, available +${count})`);
        }

        console.log('\n✅ Unassign Finished Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

unassignAmr();


import mongoose, { Schema } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';
const DEMO_ICCIDS = ['8910300000049564025', '8910300000049564873'];

// Inline Schema Definitions to avoid Import Errors
const InventoryBucketSchema = new Schema({
    partner_id: { type: Schema.Types.ObjectId, ref: 'User' },
    package_id: { type: Schema.Types.ObjectId, ref: 'EsimProductMapping' },
    package_name: String,
    region: String,
    data_limit_gb: Number,
    duration_days: Number,
    total_purchased: { type: Number, default: 0 },
    assigned_count: { type: Number, default: 0 },
    available_count: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

const EsimProfileSchema = new Schema({
    bucket_id: { type: Schema.Types.ObjectId, ref: 'InventoryBucket' },
    iccid: { type: String, required: true, unique: true },
    activation_code: String,
    qr_code_url: String,
    status: { type: String, default: 'Available' },
    assigned_to_name: String,
    assigned_to_email: String,
    assignment_date: Date,
}, { timestamps: true });

const InventoryBucket = mongoose.model('InventoryBucket', InventoryBucketSchema, 'inventory_buckets');
const EsimProfile = mongoose.model('EsimProfile', EsimProfileSchema, 'esim_profiles');

async function forceCleanup() {
    try {
        console.log('📡 Connecting to DB...');
        if (!MONGO_URI) throw new Error('MONGO_URI missing');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        for (const iccid of DEMO_ICCIDS) {
            console.log(`\n🔍 Processing ICCID: ${iccid}`);
            const profile = await EsimProfile.findOne({ iccid });

            if (!profile) {
                console.log(`   - Profile not found (Already deleted?)`);
                continue;
            }

            console.log(`   - Found Profile ID: ${profile._id}`);
            const bucket = await InventoryBucket.findById(profile.bucket_id);

            if (bucket) {
                console.log(`   - Found Bucket: ${bucket._id} (Total: ${bucket.total_purchased})`);

                // Decrement
                bucket.total_purchased = Math.max(0, bucket.total_purchased - 1);

                const status = profile.get('status');
                if (status === 'Available') {
                    bucket.available_count = Math.max(0, bucket.available_count - 1);
                } else if (status === 'Assigned') {
                    bucket.assigned_count = Math.max(0, bucket.assigned_count - 1);
                }

                if (bucket.total_purchased === 0) {
                    console.log(`   - Bucket Empty -> DELETING BUCKET`);
                    await InventoryBucket.deleteOne({ _id: bucket._id });
                } else {
                    console.log(`   - Bucket remaining -> SAVING`);
                    await bucket.save();
                }
            }

            await EsimProfile.deleteOne({ _id: profile._id });
            console.log(`   - Profile DELETED`);
        }

        console.log('\n✅ Cleanup Finished Successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

forceCleanup();

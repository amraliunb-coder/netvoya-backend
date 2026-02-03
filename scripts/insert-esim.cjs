const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

// Schemas (Simplified for script)
const InventoryBucketSchema = new mongoose.Schema({
    package_name: String,
    region: String,
    data_limit_gb: Number,
    duration_days: Number,
    available_count: Number
}, { collection: 'inventory_buckets' });

const EsimProfileSchema = new mongoose.Schema({
    bucket_id: mongoose.Types.ObjectId,
    iccid: String,
    activation_code: String,
    qr_code_url: String,
    status: { type: String, default: 'Available' }
}, { collection: 'esim_profiles' });

const InventoryBucket = mongoose.model('InventoryBucket', InventoryBucketSchema);
const EsimProfile = mongoose.model('EsimProfile', EsimProfileSchema);

const insertProfile = async () => {
    // Parse args: node insert-esim.cjs <ICCID> <CODE> [QR_URL]
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node scripts/insert-esim.cjs <ICCID> <ACTIVATION_CODE> [QR_URL]');
        process.exit(1);
    }

    const [iccid, code, qr_url] = args;
    const qrUrlFinal = qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${code}`;

    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Find a bucket (preferably a "Manual" or "Global" one, or just the first one)
        let bucket = await InventoryBucket.findOne({ package_name: /Global/i });
        if (!bucket) {
            bucket = await InventoryBucket.findOne({}); // Fallback to any bucket
        }

        if (!bucket) {
            console.error('❌ No inventory buckets found. Please populate buckets first.');
            process.exit(1);
        }

        console.log(`📦 Linking to bucket: ${bucket.package_name} (${bucket._id})`);

        // 2. Insert Profile
        const profile = await EsimProfile.create({
            bucket_id: bucket._id,
            iccid: iccid,
            activation_code: code,
            qr_code_url: qrUrlFinal,
            status: 'Available'
        });

        console.log(`✨ Successfully inserted eSIM:
        ICCID: ${profile.iccid}
        Code: ${profile.activation_code}
        Bucket: ${bucket.package_name}
        `);

        // 3. Update bucket count
        await InventoryBucket.findByIdAndUpdate(bucket._id, { $inc: { available_count: 1 } });
        console.log('📊 Bucket available count updated.');

        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
};

insertProfile();


import mongoose, { Schema } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

const InventoryBucketSchema = new Schema({
    partner_id: { type: Schema.Types.ObjectId, ref: 'User' },
    package_name: String,
    total_purchased: Number,
    assigned_count: Number,
    available_count: Number,
    createdAt: Date
});
const InventoryBucket = mongoose.model('InventoryBucket', InventoryBucketSchema, 'inventory_buckets');

async function listBuckets() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected. Listing Egypt 1GB Buckets:');

        const buckets = await InventoryBucket.find({});

        if (buckets.length === 0) {
            console.log('No buckets found.');
        }

        buckets.forEach(b => {
            console.log(`\nID: ${b._id}`);
            console.log(`Package: ${b.package_name}`);
            console.log(`Counts: Total=${b.total_purchased}, Assigned=${b.assigned_count}, Available=${b.available_count}`);
            console.log(`Created: ${b.createdAt}`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listBuckets();

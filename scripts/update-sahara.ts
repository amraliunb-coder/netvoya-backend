import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
    console.error('MONGO_URI is not defined in the environment variables');
    process.exit(1);
}

// Models
const UserSchema = new mongoose.Schema({
    companyName: String,
    email: String
}, { strict: false });

const InventoryBucketSchema = new mongoose.Schema({
    partner_id: mongoose.Schema.Types.ObjectId,
    total_purchased: Number,
    assigned_count: Number,
    available_count: Number
}, { strict: false });

const OrderSchema = new mongoose.Schema({
    partner_id: mongoose.Schema.Types.ObjectId,
    totalTokens: Number,
    totalAmount: Number,
    packages: Array
}, { strict: false });

const User = mongoose.model('User', UserSchema, 'users');
const InventoryBucket = mongoose.model('InventoryBucket', InventoryBucketSchema, 'inventory_buckets');
const Order = mongoose.model('Order', OrderSchema, 'orders');

async function updateSahara() {
    try {
        await mongoose.connect(MONGODB_URI as string);
        console.log('Connected to MongoDB');

        // Find Orders for Sahara
        const orders = await Order.find({ partner_name: /Sahara/i });
        console.log(`Found ${orders.length} orders matching partner_name 'Sahara'`);

        for (const order of orders) {
            const o = order as any;
            const partnerId = o.partner_id;

            console.log(`\n--- Order ${o._id} ---`);
            console.log(`Partner Name: ${o.partner_name}, Email: ${o.partner_email}`);
            console.log(`Tokens: ${o.totalTokens}, Amount: ${o.totalAmount}`);

            if (partnerId) {
                // Get their bucket
                const buckets = await InventoryBucket.find({ partner_id: partnerId });
                console.log(`Found ${buckets.length} buckets for this partner`);

                for (const bucket of buckets) {
                    const b = bucket as any;
                    console.log(`  Bucket: Total=${b.total_purchased}, Available=${b.available_count}, Assigned=${b.assigned_count}`);
                    if (b.total_purchased === 10) {
                        console.log(`  >> Found the target bucket! Updating...`);
                        b.total_purchased = 40;
                        b.available_count = 40 - (b.assigned_count || 0);
                        await b.save();
                        console.log(`  >> Bucket updated: Total=${b.total_purchased}, Available=${b.available_count}`);

                        // Update the order
                        o.totalTokens = 40;
                        o.totalAmount = 40 * 15.65; // 626

                        if (o.packages && o.packages.length > 0) {
                            o.packages[0].quantity = 40;
                            o.packages[0].price = 15.65;
                            o.packages[0].total = o.totalAmount;
                        }

                        await o.save();
                        console.log(`  >> Order ${o._id} updated: Tokens=${o.totalTokens}, Amount=${o.totalAmount}`);
                    }
                }
            }
        }

        console.log("\nDone.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateSahara();

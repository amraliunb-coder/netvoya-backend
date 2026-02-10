
import mongoose, { Schema } from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

const EsimProfileSchema = new Schema({
    bucket_id: { type: Schema.Types.ObjectId, ref: 'InventoryBucket' },
    iccid: String,
    activation_code: String,
    status: String,
    createdAt: Date
});
const EsimProfile = mongoose.model('EsimProfile', EsimProfileSchema, 'esim_profiles');

async function listRecent() {
    try {
        await mongoose.connect(MONGO_URI);
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        console.log(`\n🔎 Searching for profiles created after: ${startOfDay.toISOString()}`);

        const recent = await EsimProfile.find({ createdAt: { $gte: startOfDay } });
        console.log(`Found: ${recent.length} profiles.`);

        recent.forEach(p => {
            console.log(`- ICCID: ${p.iccid} | Status: ${p.status} | Created: ${p.createdAt}`);
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

listRecent();

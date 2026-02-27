import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const profiles = await mongoose.connection.collection('esim_profiles').find({
            status: { $in: ['Assigned', 'Active'] }
        }).limit(10).toArray();

        console.log(`Found ${profiles.length} active/assigned profiles.`);
        profiles.forEach(p => {
            console.log(`ICCID: ${p.iccid}, Status: ${p.status}, Updated: ${p.updatedAt}`);
        });

        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

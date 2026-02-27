import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || '';
const TARGET_ICCID = '8910300000049566044';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const profile = await mongoose.connection.collection('esim_profiles').findOne({
            iccid: TARGET_ICCID
        });

        if (profile) {
            console.log('✅ Found ICCID in DB:');
            console.log(JSON.stringify(profile, null, 2));
        } else {
            console.log('❌ ICCID not found in DB.');
        }

        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

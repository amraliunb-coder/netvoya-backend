import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';
const TARGET = '8910300000049566044';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        const profile = await mongoose.connection.collection('esim_profiles').findOne({ iccid: TARGET });
        console.log('--- FULL PROFILE START ---');
        console.log(JSON.stringify(profile, null, 2));
        console.log('--- FULL PROFILE END ---');
        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

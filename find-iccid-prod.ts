import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';
const TARGET_ICCID = '8910300000049566044';

async function test() {
    try {
        console.log('Connecting to PROD DB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected');

        const profile = await mongoose.connection.collection('esim_profiles').findOne({
            iccid: TARGET_ICCID
        });

        if (profile) {
            console.log('✅ Found ICCID in PROD DB:');
            console.log(JSON.stringify(profile, null, 2));
        } else {
            console.log('❌ ICCID not found in PROD DB.');

            // List some real ICCIDs from here
            const realOnes = await mongoose.connection.collection('esim_profiles').find({
                iccid: /^89/
            }).limit(5).toArray();
            console.log('Sample real-looking ICCIDs in PROD:');
            realOnes.forEach(r => console.log(r.iccid));
        }

        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

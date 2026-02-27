import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        const actives = await mongoose.connection.collection('esim_profiles').find({
            status: 'Active'
        }).toArray();

        console.log(`Found ${actives.length} Active profiles in PROD.`);
        actives.forEach(p => {
            console.log(`ICCID: ${p.iccid}`);
        });

        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

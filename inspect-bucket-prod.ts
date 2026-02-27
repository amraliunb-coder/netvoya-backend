import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';
const BUCKET_ID = '69987be17a84d173ce9cb933';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        const bucket = await mongoose.connection.collection('inventory_buckets').findOne({ _id: new mongoose.Types.ObjectId(BUCKET_ID) });
        console.log('✅ Bucket Found:');
        console.log(JSON.stringify(bucket, null, 2));
        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

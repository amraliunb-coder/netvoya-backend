import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';
const TARGET = '8910300000049566044';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();

        for (const col of collections) {
            console.log(`Checking collection: ${col.name}...`);
            const found = await db.collection(col.name).findOne({
                $or: [
                    { iccid: TARGET },
                    { "packages.iccid": TARGET },
                    { "esims.iccid": TARGET },
                    { activation_code: new RegExp(TARGET) }
                ]
            });
            if (found) {
                console.log(`✅ FOUND IN ${col.name}!`);
                console.log(JSON.stringify(found, null, 2));
            }
        }

        await mongoose.disconnect();
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}
test();

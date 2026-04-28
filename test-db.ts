import mongoose from 'mongoose';

const MONGO_URI = 'mongodb+srv://AMR:Bonkai30!!!@cluster0.fxdecqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function test() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db;
    
    const count = await db.collection('esimprofiles').countDocuments({ status: 'Active' });
    console.log("Total Active eSIMs in DB:", count);
    
    // Also let's check how many Sahara has
    // Sahara might be a user named Sahara
    const sahara = await db.collection('users').findOne({ $or: [{ username: /sahara/i }, { companyName: /sahara/i }] });
    if (sahara) {
        const buckets = await db.collection('inventorybuckets').find({ partner_id: sahara._id.toString() }).toArray();
        const bucketIds = buckets.map(b => b._id.toString());
        // Since EsimProfile schema uses ObjectId or string
        const bucketObjectIds = buckets.map(b => b._id);
        const activeCount = await db.collection('esimprofiles').countDocuments({
            status: 'Active',
            bucket_id: { $in: [...bucketIds, ...bucketObjectIds] }
        });
        console.log(`Total Active eSIMs for Sahara (${sahara.username} / ${sahara.companyName}):`, activeCount);
    }
    
    process.exit(0);
}

test();

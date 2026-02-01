import mongoose from 'mongoose';
const uri = 'mongodb+srv://AMR:Bonkai30!!!@cluster0.fxdecqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
async function run() {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const res = await db.collection('esim_product_mappings').updateMany({}, { $set: { is_live: true } });
    console.log('UPDATED_LIVE:' + res.modifiedCount);
    await mongoose.connection.close();
}
run();

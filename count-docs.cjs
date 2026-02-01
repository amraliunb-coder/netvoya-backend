const mongoose = require('mongoose');
const MONGO_URI = "mongodb+srv://AMR:Bonkai30!!!@cluster0.fxdecqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function countDocs() {
    try {
        await mongoose.connect(MONGO_URI);
        const db = mongoose.connection.db;

        const count1 = await db.collection('esim_product_mappings').countDocuments();
        const count2 = await db.collection('esimproductmappings').countDocuments();

        console.log(`esim_product_mappings: ${count1}`);
        console.log(`esimproductmappings: ${count2}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
countDocs();

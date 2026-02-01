const mongoose = require('mongoose');
const MONGO_URI = "mongodb+srv://AMR:Bonkai30!!!@cluster0.fxdecqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

async function checkCollections() {
    try {
        await mongoose.connect(MONGO_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
checkCollections();

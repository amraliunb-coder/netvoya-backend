import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || '';

async function check() {
    await mongoose.connect(uri, { dbName: 'netvoya' });

    const db = mongoose.connection.db;
    if (db) {
        const collections = await db.listCollections().toArray();
        console.log(`--- COLLECTIONS IN '${db.databaseName}' ---`);
        for (const c of collections) {
            console.log(c.name);
            const count = await db.collection(c.name).countDocuments();
            console.log(`   -> ${count} documents`);
        }
    }

    mongoose.disconnect();
}
check().catch(console.error);

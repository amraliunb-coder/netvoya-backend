
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function testConnection() {
    try {
        console.log(`📡 Connecting to: ${MONGO_URI.replace(/:([^:@]+)@/, ':****@')}`);
        console.log('With Options: maxPoolSize=10, serverSelectionTimeoutMS=10000, family=4');

        await mongoose.connect(MONGO_URI, {
            maxPoolSize: 10,
            minPoolSize: 2,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4,
            retryWrites: true,
            w: 'majority'
        } as any);

        console.log('✅ MongoDB Connected Successfully with Server Options!');
        const collections = await mongoose.connection.db?.listCollections().toArray();
        console.log(`📚 Collections found: ${collections?.length}`);
        process.exit(0);
    } catch (err: any) {
        console.error('❌ Connection Failed:', err.message);
        process.exit(1);
    }
}

testConnection();

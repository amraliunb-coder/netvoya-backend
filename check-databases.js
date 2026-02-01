import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function checkDatabases() {
    const MONGODB_URI = process.env.MONGODB_URI;
    const MONGO_URI = process.env.MONGO_URI;

    console.log('🔍 Environment Variables:');
    console.log('MONGODB_URI:', MONGODB_URI ? MONGODB_URI.substring(0, 30) + '...' : 'NOT SET');
    console.log('MONGO_URI:', MONGO_URI ? MONGO_URI.substring(0, 30) + '...' : 'NOT SET');

    console.log('\n📊 Testing MONGODB_URI (Integration):');
    try {
        await mongoose.connect(MONGODB_URI);

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        console.log(`Database name: ${db.databaseName}`);
        console.log(`Collections: ${collections.map(c => c.name).join(', ')}`);

        // Count users in 'users' collection
        const usersCount = await db.collection('users').countDocuments();
        console.log(`Users in 'users' collection: ${usersCount}`);

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error.message);
    }

    if (MONGO_URI && MONGO_URI !== MONGODB_URI) {
        console.log('\n📊 Testing MONGO_URI (Manual):');
        try {
            await mongoose.connect(MONGO_URI);

            const db = mongoose.connection.db;
            const collections = await db.listCollections().toArray();
            console.log(`Database name: ${db.databaseName}`);
            console.log(`Collections: ${collections.map(c => c.name).join(', ')}`);

            const usersCount = await db.collection('users').countDocuments();
            console.log(`Users in 'users' collection: ${usersCount}`);

            await mongoose.connection.close();
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    process.exit(0);
}

checkDatabases();

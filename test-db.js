import mongoose from 'mongoose';

// The Standard Connection String
const uri = 'mongodb://vercel_admin:wiASFYfvMPDedHck@ac-63lt4u9-shard-00-00.fxdecqe.mongodb.net:27017,ac-63lt4u9-shard-00-01.fxdecqe.mongodb.net:27017,ac-63lt4u9-shard-00-02.fxdecqe.mongodb.net:27017/?ssl=true&replicaSet=atlas-xbac5h-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0';

console.log('Testing connection...');

mongoose.connect(uri, {
    serverSelectionTimeoutMS: 5000
})
    .then(() => {
        console.log('✅ SUCCESS! Connected to MongoDB.');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ FAILED:', err.message);
        process.exit(1);
    });

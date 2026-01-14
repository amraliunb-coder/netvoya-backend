import mongoose from 'mongoose';

const uri = process.env.MONGO_URI || '';

console.log('Testing Connection to:', uri.replace(/:([^:@]+)@/, ':****@')); // Hide password in logs

async function test() {
    try {
        await mongoose.connect(uri);
        console.log('✅ Success! Connected to MongoDB.');
        await mongoose.connection.close();
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Failed:', error.message);
        process.exit(1);
    }
}

test();

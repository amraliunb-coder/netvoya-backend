import mongoose from 'mongoose';
import User from '../models/User.js';

// Hardcoded Prod URI provided by user
const MONGO_URI = 'mongodb+srv://Vercel-Admin-atlas-green-ball:yIVFwpDna30tId6Q@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority';

const checkUser = async () => {
    try {
        console.log('📡 Connecting to PROD Database...');
        await mongoose.connect(MONGO_URI);

        const email = 'khairy@sahara-egypt.com';
        const user = await User.findOne({ email });

        if (user) {
            console.log('✅ User Found:');
            console.log(`   - Username: ${user.username}`);
            console.log(`   - Email: ${user.email}`);
            console.log(`   - First Name: ${user.firstName}`); // Should be Khairy
            console.log(`   - Company: ${user.companyName}`); // Should be Sahara Egypt
            console.log(`   - Role: ${user.role}`);

            if (user.firstName !== 'Khairy' || user.companyName !== 'Sahara Egypt') {
                console.warn('⚠️ details mismatch! Updating...');
                user.firstName = 'Khairy';
                user.lastName = 'Partner';
                user.companyName = 'Sahara Egypt';
                await user.save();
                console.log('✅ User details updated.');
            } else {
                console.log('✅ Details match requirements.');
            }
        } else {
            console.error('❌ User not found!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

checkUser();

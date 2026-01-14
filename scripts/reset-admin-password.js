const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Standard Verification Connection String (Update if environment variable is different)
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI is missing in .env file');
    process.exit(1);
}

async function resetAdminPassword() {
    try {
        console.log('📡 Connecting to database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected');

        // Simple User Schema definition for this script
        const User = mongoose.model('User', new mongoose.Schema({
            email: String,
            password: String,
            role: String
        }), 'users'); // Force collection name to 'users'

        const email = 'admin@netvoya.com';

        // Prompt for password would be ideal, but for now we instruct user to edit this
        // OR better: generate a random one

        // Generate a random strong password
        const generatePassword = (length = 16) => {
            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
            let retVal = "";
            for (let i = 0, n = charset.length; i < length; ++i) {
                retVal += charset.charAt(Math.floor(Math.random() * n));
            }
            return retVal;
        };

        const newPassword = generatePassword(20);
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const result = await User.updateOne(
            { email: email },
            { $set: { password: hashedPassword } }
        );

        if (result.matchedCount === 0) {
            console.error(`❌ User ${email} not found.`);
        } else {
            console.log('\n═══════════════════════════════════════════════════════');
            console.log('✅ Admin Password Reset Successfully');
            console.log('═══════════════════════════════════════════════════════');
            console.log(`📧 Email:    ${email}`);
            console.log(`🔑 Password: ${newPassword}`);
            console.log('═══════════════════════════════════════════════════════');
            console.log('⚠️  SAVE THIS PASSWORD NOW. It will not be shown again.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

resetAdminPassword();

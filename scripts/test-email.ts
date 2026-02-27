import emailService from '../services/emailService.js';
import dotenv from 'dotenv';
dotenv.config();

const testEmail = async () => {
    console.log('🧪 Testing Email Configuration...');

    // Mock Request
    const details = {
        totalTokens: 100,
        totalAmount: 475.00,
        discountLabel: '5%',
        packages: [
            { name: "Test Package 1GB", region: "Egypt", quantity: 50, price: 4.75, total: 237.50 },
            { name: "Test Package 2GB", region: "USA", quantity: 50, price: 4.75, total: 237.50 }
        ],
        partnerInfo: {
            name: "Test Partner",
            email: "partner@test.com",
            role: "Partner"
        }
    };

    const result = await emailService.sendInventoryRequestEmail(details);

    if (result.success) {
        console.log('✅ Email sent successfully!');
        console.log('Check your inbox for the test email.');
        process.exit(0);
    } else {
        console.error('❌ Email failed:', result.error);
        process.exit(1);
    }
};

testEmail();

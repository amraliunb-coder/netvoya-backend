
import esimVendorService from '../services/esimVendorService';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from parent directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const runTest = async () => {
    try {
        console.log('🚀 Starting eSIM Integration Test...');

        // 1. Test Login
        console.log('\nTesting Login...');
        const token = await esimVendorService.login();
        console.log('✅ Login Successful. Token:', token.substring(0, 20) + '...');

        // 2. Test Get Packages
        console.log('\nTesting Get Packages...');
        const packages = await esimVendorService.getPackages();
        console.log(`✅ Retrieved ${packages.length} packages`);
        if (packages.length > 0) {
            console.log('Sample Package:', JSON.stringify(packages[0], null, 2));
        }

        // 3. Test Get Pricing
        console.log('\nTesting Get Pricing...');
        const pricing = await esimVendorService.getPricing();
        console.log('✅ Pricing Data Retrieved');
        console.log('Pricing keys:', Object.keys(pricing).slice(0, 5));

        console.log('\n🎉 All tests passed!');
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Response Data:', error.response.data);
            console.error('Response Status:', error.response.status);
        }
        process.exit(1);
    }
};

runTest();

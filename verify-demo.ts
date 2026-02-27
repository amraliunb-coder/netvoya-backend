
import esimVendorService from './services/esimVendorService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Mongoose connection not strictly needed for the service mock test 
// but might be required if the service initializes DB models. 
// However, getEsimDetailsByIccid seems independent of DB models for this mock.

async function verifyDemo() {
    const DEMO_ICCID = '8910300000049564025';
    console.log(`🧪 Testing Demo Mode for ICCID: ${DEMO_ICCID}`);

    try {
        const details = await esimVendorService.getEsimDetailsByIccid(DEMO_ICCID);
        console.log('✅ Success! Received Mock Data:');
        console.log(JSON.stringify(details, null, 2));

        if (details.status === 'Active' && details.product_name === 'Egypt 1GB') {
            console.log('✨ Verification Passed: Mock data matches expected structure.');
        } else {
            console.error('❌ Verification Failed: Data does not match expected mock.');
        }
    } catch (err: any) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

verifyDemo();


import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';
const TEST_ICCID = '8910300000049564873';

const testIccidLookup = async () => {
    try {
        console.log('📡 Logging in...');
        const loginResp = await axios.post(`${API_BASE_URL}/login`, {
            email: VENDOR_EMAIL,
            password: VENDOR_PASSWORD
        });
        const token = loginResp.data?.access_token || loginResp.data?.token;
        console.log('✅ Token received.');

        const endpoints = [
            `/package/check/${TEST_ICCID}`,
            `/package/details/${TEST_ICCID}`,
            `/esim/details/${TEST_ICCID}`,
            `/inventory/details/${TEST_ICCID}`,
            `/redeem/details/${TEST_ICCID}`,
            `/redeem/check/${TEST_ICCID}`,
            `/check/${TEST_ICCID}`,
            `/info/${TEST_ICCID}`
        ];

        for (const ep of endpoints) {
            console.log(`📡 Trying: ${ep}...`);
            try {
                const resp = await axios.get(`${API_BASE_URL}${ep}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`✅ SUCCESS on ${ep}:`, JSON.stringify(resp.data, null, 2));
                return;
            } catch (err: any) {
                console.log(`❌ FAILED on ${ep}: ${err.response?.status}`);
            }
        }

    } catch (error: any) {
        console.error('❌ Error during test:', error.message);
    }
};

testIccidLookup();

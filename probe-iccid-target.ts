import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';
const TARGET_ICCID = '8910300000049566044';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, { email: VENDOR_EMAIL, password: VENDOR_PASSWORD });
        const token = loginRes.data?.access_token || loginRes.data?.token;

        const endpoints = [
            `/package/check/${TARGET_ICCID}`,
            `/package/details/${TARGET_ICCID}`,
            `/esim/details/${TARGET_ICCID}`,
            `/inventory/details/${TARGET_ICCID}`,
            `/redeem/details/${TARGET_ICCID}`,
            `/redeem/check/${TARGET_ICCID}`,
            `/check/${TARGET_ICCID}`,
            `/info/${TARGET_ICCID}`,
            `/activation/${TARGET_ICCID}`
        ];

        for (const ep of endpoints) {
            console.log(`\n📡 Trying: ${ep}...`);
            try {
                const resp = await axios.get(`${API_BASE_URL}${ep}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`✅ SUCCESS on ${ep}:`, JSON.stringify(resp.data, null, 2).substring(0, 1000));
            } catch (err: any) {
                console.log(`❌ FAILED on ${ep}: ${err.response?.status}`);
            }
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

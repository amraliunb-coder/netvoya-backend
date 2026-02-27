import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'karim@shaarany.co';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'Ka5819861';
const MATCHING_ID = 'TN20251125191156C071C145';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, { email: VENDOR_EMAIL, password: VENDOR_PASSWORD });
        const token = loginRes.data?.access_token || loginRes.data?.token;

        const eps = [
            `/order/${MATCHING_ID}`,
            `/package/check/${MATCHING_ID}`,
            `/check/${MATCHING_ID}`,
            `/redeem/check/${MATCHING_ID}`
        ];

        for (const ep of eps) {
            console.log(`\n📡 Trying: ${ep}...`);
            try {
                const res = await axios.get(`${API_BASE_URL}${ep}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.data?.data && (Array.isArray(res.data.data) ? res.data.data.length > 0 : true)) {
                    console.log(`✅ SUCCESS on ${ep}:`);
                    console.log(JSON.stringify(res.data, null, 2));
                    return;
                } else {
                    console.log(`❌ No data on ${ep}`);
                }
            } catch (err: any) {
                console.log(`❌ FAILED on ${ep}: ${err.response?.status}`);
            }
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

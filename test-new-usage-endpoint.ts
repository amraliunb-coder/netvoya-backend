import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'karim@shaarany.co';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'Ka5819861';
const ICCID = '8910300000049566044';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, { email: VENDOR_EMAIL, password: VENDOR_PASSWORD });
        const token = loginRes.data?.access_token || loginRes.data?.token;

        console.log(`\n📡 Testing NEW endpoint: /my-sim/${ICCID}/usage`);
        const res = await axios.get(`${API_BASE_URL}/my-sim/${ICCID}/usage`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });

        console.log('--- RESPONSE START ---');
        console.log(JSON.stringify(res.data, null, 2));
        console.log('--- RESPONSE END ---');

        if (res.data.status && res.data.data) {
            console.log('✅ SUCCESS! Usage data retrieved correctly.');
        } else {
            console.log('❌ FAILED: Unexpected response structure.');
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

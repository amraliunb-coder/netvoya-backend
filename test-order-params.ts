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

        const params = [
            'type=usage',
            'details=true',
            'usage=1',
            'full=true',
            'balance=1',
            'iccid=' + ICCID
        ];

        for (const p of params) {
            console.log(`\n📡 Trying: /order/${ICCID}?${p}...`);
            try {
                const res = await axios.get(`${API_BASE_URL}/order/${ICCID}?${p}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.data?.data && (Array.isArray(res.data.data) ? res.data.data.length > 0 : true)) {
                    console.log(`✅ SUCCESS with ${p}:`);
                    console.log(JSON.stringify(res.data, null, 2));
                    return;
                } else {
                    console.log(`❌ No data with ${p}`);
                }
            } catch (err: any) {
                console.log(`❌ FAILED with ${p}: ${err.response?.status}`);
            }
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

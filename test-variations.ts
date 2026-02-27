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

        const variations = [
            ICCID,
            ICCID.substring(0, 18),
            ICCID + '0',
            '0' + ICCID
        ];

        for (const v of variations) {
            console.log(`\n🔍 ICCID Variation: ${v}`);
            const eps = [
                `/order/${v}`,
                `/top-up/check/${v}`,
                `/usage/${v}`,
            ];
            for (const ep of eps) {
                try {
                    const res = await axios.get(`${API_BASE_URL}${ep}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.data?.data && (Array.isArray(res.data.data) ? res.data.data.length > 0 : true)) {
                        console.log(`✅ SUCCESS on ${ep} with ${v}:`);
                        console.log(JSON.stringify(res.data, null, 2));
                        return;
                    } else {
                        console.log(`❌ No data on ${ep} with ${v}`);
                    }
                } catch (err: any) {
                    console.log(`❌ FAILED on ${ep} with ${v}: ${err.response?.status}`);
                }
            }
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

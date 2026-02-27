import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'karim@shaarany.co';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'Ka5819861';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, { email: VENDOR_EMAIL, password: VENDOR_PASSWORD });
        const token = loginRes.data?.access_token || loginRes.data?.token;

        console.log('Fetching /order without ID...');
        const res = await axios.get(`${API_BASE_URL}/order`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log(`Success! Status: ${res.status}`);
        console.log('Data structure:', Object.keys(res.data));
        if (Array.isArray(res.data.data)) {
            console.log(`Found ${res.data.data.length} orders.`);
            if (res.data.data.length > 0) {
                console.log('Sample Order:', JSON.stringify(res.data.data[0], null, 2));
                // Look for our ICCID
                const found = res.data.data.find((o: any) =>
                    o.iccid === '8910300000049566044' ||
                    (o.data && o.data.some((d: any) => d.iccid === '8910300000049566044'))
                );
                if (found) {
                    console.log('✅ Found target ICCID in the list!');
                    console.log(JSON.stringify(found, null, 2));
                }
            }
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

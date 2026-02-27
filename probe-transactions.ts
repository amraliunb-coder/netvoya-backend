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

        const eps = [
            '/transaction',
            '/transactions',
            '/transaction-history',
            '/purchase-history',
            '/billing',
            '/usage-report',
            '/balance'
        ];

        for (const ep of eps) {
            console.log(`\n📡 Trying: ${ep}...`);
            try {
                const res = await axios.get(`${API_BASE_URL}${ep}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`✅ SUCCESS on ${ep}:`, JSON.stringify(res.data, null, 2).substring(0, 500));
            } catch (err: any) {
                console.log(`❌ FAILED on ${ep}: ${err.response?.status}`);
            }
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

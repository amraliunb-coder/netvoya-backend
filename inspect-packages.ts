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

        console.log('Fetching sample from /packages...');
        const res = await axios.get(`${API_BASE_URL}/packages?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();


import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';

async function debug() {
    try {
        console.log('Authenticating...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, {
            email: VENDOR_EMAIL,
            password: VENDOR_PASSWORD
        });

        const token = loginRes.data?.access_token || loginRes.data?.token;

        // 1. Check Packages (Connectivity Check)
        console.log(`\n🔍 Checking /packages (connectivity)...`);
        try {
            const res = await axios.get(`${API_BASE_URL}/packages?limit=1`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`✅ SUCCESS (/packages): Got ${res.data?.data?.length || 0} items.`);
        } catch (err: any) {
            console.log(`❌ FAILED (/packages): ${err.message}`);
        }

        // 2. Check Random ICCID (Negative Control)
        const randomICCID = '8900000000000000000';
        console.log(`\n🔍 Checking Random ICCID: ${randomICCID}...`);
        try {
            const res = await axios.get(`${API_BASE_URL}/order/${randomICCID}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`Response for RANDOM:`);
            console.log(JSON.stringify(res.data, null, 2));
        } catch (err: any) {
            console.log(`❌ FAILED (Random): ${err.response?.status}`);
        }

    } catch (err: any) {
        console.error('Error:', err.response?.data || err.message);
    }
}

debug();

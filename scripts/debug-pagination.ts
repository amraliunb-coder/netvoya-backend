import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL;
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD;

async function debug() {
    try {
        console.log('Login...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, { email: VENDOR_EMAIL, password: VENDOR_PASSWORD });
        const token = loginRes.data.access_token || loginRes.data.token;
        console.log('Token len:', token.length);

        console.log('Fetching Packages Page 1...');
        const pkgRes = await axios.get(`${API_BASE_URL}/packages?page=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('Status:', pkgRes.status);
        console.log('Keys in data:', Object.keys(pkgRes.data));

        if (pkgRes.data.meta) {
            console.log('Keys in meta:', Object.keys(pkgRes.data.meta));
            console.log('Meta contents:', JSON.stringify(pkgRes.data.meta, null, 2));
        } else {
            console.log('❌ No meta field found!');
        }

        if (pkgRes.data.links) {
            console.log('Links contents:', JSON.stringify(pkgRes.data.links, null, 2));
        }

    } catch (err: any) {
        console.error(err.message);
        if (err.response) console.error(err.response.data);
    }
}
debug();

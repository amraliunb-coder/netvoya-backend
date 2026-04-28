import axios from 'axios';
import 'dotenv/config';

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';

async function test() {
    console.log("Logging in to vendor API...");
    try {
        const login = await axios.post(`${API_BASE_URL}/login`, { 
            email: VENDOR_EMAIL, 
            password: VENDOR_PASSWORD 
        });
        const token = login.data.access_token || login.data.token;
        console.log("Token acquired.");
        
        const iccid = process.argv[2] || '8910300000049562769';
        console.log(`Fetching usage for ${iccid}...`);
        const usage = await axios.get(`${API_BASE_URL}/my-sim/${iccid}/usage`, {
            headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
        });
        console.log("Success:", JSON.stringify(usage.data, null, 2));
    } catch (e) {
        console.error("Error:");
        if (e.response) {
            console.error(JSON.stringify(e.response.data, null, 2));
        } else {
            console.error(e.message);
        }
    }
}

test();

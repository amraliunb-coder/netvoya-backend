import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';
const ICCID = '8910300000049566044';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, { email: VENDOR_EMAIL, password: VENDOR_PASSWORD });
        const token = loginRes.data?.access_token || loginRes.data?.token;

        const endpoints = [
            `/esim/${ICCID}`,
            `/esims/${ICCID}`,
            `/iccid/${ICCID}`,
            `/usage/${ICCID}`,
            `/order?iccid=${ICCID}`,
            `/sims/${ICCID}`,
        ];

        for (const ep of endpoints) {
            try {
                const res = await axios.get(`${API_BASE_URL}${ep}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`\nSUCCESS on ${ep}:`);
                console.log(JSON.stringify(res.data, null, 2).substring(0, 500));
            } catch (err: any) {
                console.log(`\nFAILED on ${ep}: ${err.response?.status} - ${err.response?.statusText}`);
            }
        }
    } catch (e: any) {
        console.error('Login Error:', e.response?.data || e.message);
    }
}
test();

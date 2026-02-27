import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';
const TARGET_ICCID = '8910300000049566044';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post(`${API_BASE_URL}/login`, { email: VENDOR_EMAIL, password: VENDOR_PASSWORD });
        const token = loginRes.data?.access_token || loginRes.data?.token;

        console.log('Fetching orders...');
        const ordersRes = await axios.get(`${API_BASE_URL}/orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const orders = ordersRes.data?.data || [];
        console.log(`Retrieved ${orders.length} orders.`);

        const found = orders.find((o: any) => o.iccid === TARGET_ICCID || (o.data && o.data.some((d: any) => d.iccid === TARGET_ICCID)));

        if (found) {
            console.log('✅ Found ICCID in orders list:');
            console.log(JSON.stringify(found, null, 2));
        } else {
            console.log('❌ ICCID not found in the first page of orders.');
            if (orders.length > 0) {
                console.log('Sample Order:', JSON.stringify(orders[0], null, 2));
            }
        }
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();

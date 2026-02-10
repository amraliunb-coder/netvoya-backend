
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = 'https://portal.esimcard.com/api/developer/reseller';
const VENDOR_EMAIL = process.env.ESIM_VENDOR_EMAIL || 'dealer123@gmail.com';
const VENDOR_PASSWORD = process.env.ESIM_VENDOR_PASSWORD || 'testUser123';
const TEST_ICCID = '8910300000049564873';

const testIccidLookup = async () => {
    try {
        console.log('📡 Logging in...');
        const loginResp = await axios.post(`${API_BASE_URL}/login`, {
            email: VENDOR_EMAIL,
            password: VENDOR_PASSWORD
        });
        const token = loginResp.data?.access_token || loginResp.data?.token;
        console.log('✅ Token received.');

        const routes = ['/inventory', '/esims', '/orders'];
        for (const route of routes) {
            console.log(`📡 Checking route: ${route}...`);
            try {
                const resp = await axios.get(`${API_BASE_URL}${route}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log(`✅ ${route} status: ${resp.data.status}`);
                const list = resp.data.data || [];
                console.log(`Count: ${list.length}`);
                const match = list.find((item: any) => item.iccid === TEST_ICCID);
                if (match) {
                    console.log('🎯 MATCH FOUND IN LIST:', JSON.stringify(match, null, 2));
                    return;
                }
            } catch (err: any) {
                console.log(`❌ FAILED on ${route}: ${err.response?.status}`);
            }
        }

        console.log('❌ ICCID not found in basic list. Trying advanced packages lookup...');
        // Maybe it's under packages -> detail?
        const pkgsResp = await axios.get(`${API_BASE_URL}/packages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const pkgs = pkgsResp.data?.data || [];
        console.log(`Retrieved ${pkgs.length} packages.`);

    } catch (error: any) {
        console.error('❌ Error during test:', error.message);
    }
};

testIccidLookup();

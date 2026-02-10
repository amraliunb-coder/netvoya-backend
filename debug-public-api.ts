
import axios from 'axios';

const ICCID = '8910300000049564025';
const URL = `https://esimcard.com/api/landing/redeem/${ICCID}`;

async function test() {
    console.log(`Target: ${URL}`);

    // Try GET
    try {
        console.log('--- Trying GET ---');
        const res = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://esimdelivery.com/'
            }
        });
        console.log('✅ GET Success:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
        console.log('❌ GET Failed:', err.response?.status, err.message);
    }

    // Try POST
    try {
        console.log('--- Trying POST ---');
        const res = await axios.post(URL, {}, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://esimdelivery.com/'
            }
        });
        console.log('✅ POST Success:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
        console.log('❌ POST Failed:', err.response?.status, err.message);
    }
}

test();

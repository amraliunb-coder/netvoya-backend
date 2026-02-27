import axios from 'axios';

const ICCID = '8910300000049566044';
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
        console.log('SUCCESS (GET):');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.log(`FAILED (GET): ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
    }

    // Try POST
    try {
        console.log('\n--- Trying POST ---');
        const res = await axios.post(URL, {}, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://esimdelivery.com/'
            }
        });
        console.log('SUCCESS (POST):');
        console.log(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.log(`FAILED (POST): ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
    }
}

test();

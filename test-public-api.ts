import axios from 'axios';

const ICCID = '8910300000049566044';
const URL = `https://esimcard.com/api/landing/redeem/${ICCID}`;

async function test() {
    console.log(`Target: ${URL}`);

    try {
        const res = await axios.post(URL, {}, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://esimdelivery.com/'
            }
        });
        console.log('✅ Success:', JSON.stringify(res.data, null, 2));
    } catch (err: any) {
        console.log('❌ Failed:', err.response?.status, err.message);
        if (err.response?.data) {
            console.log('Error Data:', JSON.stringify(err.response.data, null, 2));
        }
    }
}

test();

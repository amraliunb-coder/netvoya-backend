// Node 18+ has global fetch
const API_URL = 'https://netvoya-backend.vercel.app/api/login';

const testLiveLogin = async () => {
    try {
        console.log(`📡 Testing Login against: ${API_URL}`);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'khairy@sahara-egypt.com',
                password: 'Password@123'
            })
        });

        const data = await response.json();

        console.log(`Status: ${response.status}`);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (response.status === 200) {
            console.log('✅ LOGIN SUCCESSFUL');
        } else {
            console.log('❌ LOGIN FAILED');
        }

    } catch (error) {
        console.error('❌ Request Error:', error);
    }
};

testLiveLogin();

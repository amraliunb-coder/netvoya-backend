// Node 18+ has global fetch
const API_URL = 'https://netvoya-backend.vercel.app/api/health';

const checkHealth = async () => {
    try {
        console.log(`📡 Checking Health: ${API_URL}`);

        const response = await fetch(API_URL);
        const data = await response.json();

        console.log(`Status: ${response.status}`);
        console.log('Response:', JSON.stringify(data, null, 2));

    } catch (error) {
        console.error('❌ Request Error:', error);
    }
};

checkHealth();

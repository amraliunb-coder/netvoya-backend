// Quick test to verify the backend login endpoint works
async function testLogin() {
    const response = await fetch('https://netvoya-backend.vercel.app/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: 'admin@netvoya.com',
            password: 'adminPassword123!'
        })
    });

    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
}

testLogin();

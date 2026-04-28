import axios from 'axios';

async function testBackend() {
    try {
        console.log("Fetching from Vercel backend...");
        const res = await axios.post("https://netvoya-backend.vercel.app/api/esim/usage/batch", {
            iccids: ["8910300000049562769", "8910300000049566567"]
        });
        console.log("Vercel Success:", JSON.stringify(res.data, null, 2));
    } catch (e: any) {
        console.error("Vercel Error:", e.response ? e.response.data : e.message);
    }
}

testBackend();

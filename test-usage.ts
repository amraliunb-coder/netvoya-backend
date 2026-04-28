import esimVendorService from './services/esimVendorService.js';
import mongoose from 'mongoose';

async function test() {
    try {
        const iccid = process.argv[2] || '8910300000049562769';
        console.log("Testing ICCID", iccid);
        const details = await esimVendorService.getEsimDetailsByIccid(iccid);
        console.log("Success:", JSON.stringify(details, null, 2));
    } catch (e: any) {
        console.error("Error:", e.message);
        if (e.response && e.response.data) {
            console.error("Response data:", JSON.stringify(e.response.data, null, 2));
        }
    }
    process.exit(0);
}

test();

import esimVendorService from './services/esimVendorService.js';
import dotenv from 'dotenv';
dotenv.config();

const ICCID = '8910300000049566044';

async function test() {
    try {
        console.log(`🚀 Testing Final Implementation for ICCID: ${ICCID}`);

        const details = await esimVendorService.getEsimDetailsByIccid(ICCID);

        console.log('\n--- Mapped Internal Data ---');
        console.log(JSON.stringify(details, null, 2));

        if (details.iccid === ICCID && details.balance && details.balance.remaining_data) {
            console.log('\n✅ VERIFICATION SUCCESS: Accurate usage data retrieved and mapped correctly.');
            console.log(`   Remaining: ${details.balance.remaining_data}`);
        } else {
            console.log('\n❌ VERIFICATION FAILED: Data mapping or retrieval failed.');
        }

    } catch (e: any) {
        console.error('\n❌ ERROR during verification:', e.message);
    }
}

test();

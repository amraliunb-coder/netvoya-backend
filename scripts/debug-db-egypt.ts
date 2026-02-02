import mongoose from 'mongoose';
import EsimProductMapping from '../models/EsimProductMapping.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkEgypt() {
    await mongoose.connect(process.env.MONGO_URI || '');

    const packages = await EsimProductMapping.find({
        name: { $regex: /Egypt/i }
    }).lean();

    console.log(`\n🔍 Found ${packages.length} Egypt packages in DB:`);
    packages.forEach(p => {
        console.log(`- [${p.vendor_package_id}] ${p.name} | Region: ${p.region} | Wholesale: $${p.wholesale_cost} | Retail: $${p.retail_price} | Live: ${p.is_live}`);
    });

    process.exit(0);
}
checkEgypt();

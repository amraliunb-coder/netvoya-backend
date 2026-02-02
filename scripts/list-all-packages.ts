import mongoose from 'mongoose';
import EsimProductMapping from '../models/EsimProductMapping.js';
import dotenv from 'dotenv';
dotenv.config();

async function listAll() {
    console.log(`📡 Connecting to ${process.env.MONGO_URI ? 'URI found' : 'NO URI'}...`);
    await mongoose.connect(process.env.MONGO_URI || '');

    const count = await EsimProductMapping.countDocuments();
    const packages = await EsimProductMapping.find().sort({ name: 1 }).lean();

    console.log(`\n📊 Total Packages in Local DB: ${count}`);
    console.log('--------------------------------------------------');
    packages.forEach(p => {
        console.log(`[${p.vendor_package_id}] ${p.name} ($${p.retail_price})`);
    });
    console.log('--------------------------------------------------');

    process.exit(0);
}
listAll();

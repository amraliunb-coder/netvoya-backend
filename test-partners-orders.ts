import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || '';
import User from './models/User.js';
import Order from './models/Order.js';

async function check() {
    await mongoose.connect(uri, { dbName: 'netvoya' });

    const partners = await User.find({ role: 'partner' });
    console.log(`--- PARTNERS (${partners.length}) ---`);
    for (const p of partners) {
        console.log(`User: ${p.companyName} | Email: ${p.email} | ID: ${p._id}`);
        // Now get their orders
        const orders = await Order.find({ partner_id: p._id.toString() });
        console.log(`   -> Orders: ${orders.length}`);
        let completed = 0;
        for (const o of orders) {
            console.log(`      Order ID: ${o._id} | Tokens: ${o.totalTokens} | Status: "${o.status}"`);
            if (o.status === 'Completed') completed += o.totalTokens;
        }
    }

    mongoose.disconnect();
}
check().catch(console.error);

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || '';
import Order from './models/Order.js';

async function check() {
    await mongoose.connect(uri, { dbName: 'netvoya' });

    const orders = await Order.find({ partner_email: { $regex: /sahara|khairy/i } });
    console.log(`--- SAHARA ORDERS (${orders.length}) ---`);
    let totalTokens = 0;
    orders.forEach((o: any) => {
        console.log(`Order ID: ${o._id}`);
        console.log(`Total Tokens: ${o.totalTokens}`);
        console.log(`Status: "${o.status}"`);
        console.log('-----------------------------------');
        if (o.status === 'Completed') {
            totalTokens += o.totalTokens;
        }
    });
    console.log(`Tokens from Completed orders: ${totalTokens}`);

    mongoose.disconnect();
}
check().catch(console.error);

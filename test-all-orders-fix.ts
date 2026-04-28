import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
import Order from './models/Order.js';

async function check() {
    await mongoose.connect(uri);

    const orders = await Order.find({});
    console.log(`--- ALL ORDERS (${orders.length}) ---`);
    orders.forEach((o: any) => {
        console.log(`Order ID: ${o._id}`);
        console.log(`Partner: ${o.partner_name} (${o.partner_email})`);
        console.log(`Total Tokens: ${o.totalTokens}`);
        console.log(`Status: ${o.status}`);
        console.log('-----------------------------------');
    });

    mongoose.disconnect();
}
check().catch(console.error);

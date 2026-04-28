import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGO_URI || '';
import Order from './models/Order.js';

async function check() {
    await mongoose.connect(uri);

    // Find sahara orders
    const orders = await Order.find({ partner_email: { $regex: /sahara|khairy/i } });
    console.log('--- SAHARA ORDERS ---');
    if (orders.length > 0) {
        orders.forEach((o: any) => {
            console.log(`Order ID: ${o._id}`);
            console.log(`Total Tokens: ${o.totalTokens}`);
            console.log(`Status: ${o.status}`);
            console.log('-----------------------------------');
        });
    } else {
        console.log('No orders found.');
    }

    mongoose.disconnect();
}
check().catch(console.error);

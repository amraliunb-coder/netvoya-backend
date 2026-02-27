import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Order from './models/Order';
import EsimProductMapping from './models/EsimProductMapping';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI as string);
    const order = await Order.findOne({ status: 'Completed', totalTokens: 100 }).sort({ createdAt: -1 });
    console.log("Found Order:", JSON.stringify(order, null, 2));

    if (order && order.packages.length > 0) {
        const pkg = order.packages[0];
        const mapping = await EsimProductMapping.findOne({ name: pkg.name, region: pkg.region });
        console.log("Mapping for package:", JSON.stringify(mapping, null, 2));
    }

    process.exit(0);
}

check();

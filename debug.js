const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Connect to specific collections
    const db = mongoose.connection.db;
    
    // Check orders
    const orders = await db.collection('orders').find({ status: 'Completed', totalTokens: 100 }).sort({ createdAt: -1 }).toArray();
    console.log("Found Orders:", JSON.stringify(orders, null, 2));

    if (orders && orders.length > 0 && orders[0].packages) {
        const pkg = orders[0].packages[0];
        const mapping = await db.collection('esim_product_mappings').findOne({ name: pkg.name, region: pkg.region });
        console.log("Mapping for package:", JSON.stringify(mapping, null, 2));
    }

    process.exit(0);
}

check();

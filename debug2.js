const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    await mongoose.connect(process.env.MONGO_URI);

    // Connect to specific collections
    const db = mongoose.connection.db;

    // Check orders
    const orders = await db.collection('orders').find({ status: 'Completed' }).sort({ createdAt: -1 }).limit(5).toArray();
    console.log("Recent Completed Orders:");
    orders.forEach(o => {
        console.log(`ID: ${o._id}, Tokens: ${o.totalTokens}, Amount: ${o.totalAmount}, Cost: ${o.totalCost}, Profit: ${o.totalProfit}`);
        console.log(`Packages: ${JSON.stringify(o.packages, null, 2)}`);
    });

    if (orders && orders.length > 0 && orders[0].packages) {
        const pkg = orders[0].packages[0];
        const mapping = await db.collection('esim_product_mappings').findOne({ name: pkg.name, region: pkg.region });
        console.log("Mapping for package:", JSON.stringify(mapping, null, 2));
    }

    process.exit(0);
}

check();

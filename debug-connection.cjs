const mongoose = require('mongoose');
const dns = require('dns');

const uri = "mongodb+srv://netvoya_app:smlsxeP62ASD6iSy@cluster0.fxdecqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

console.log("1. Resolving DNS for cluster0.fxdecqe.mongodb.net...");

// Try to resolve SRV record (which mongodb+srv uses)
dns.resolveSrv('_mongodb._tcp.cluster0.fxdecqe.mongodb.net', (err, addresses) => {
    if (err) {
        console.error("   [ERROR] SRV DNS Resolution Failed:", err.message);
    } else {
        console.log("   [OK] SRV Records found:", JSON.stringify(addresses));
    }
});

console.log("2. Attempting to connect with Mongoose...");
mongoose.set('strictQuery', false);
mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("   [SUCCESS] Connected to MongoDB!");
        mongoose.connection.close();
        process.exit(0);
    })
    .catch(err => {
        console.error("   [ERROR] CONNECTION FAILED:");
        console.error("   Name:", err.name);
        console.error("   Message:", err.message);
        if (err.reason) console.error("   Reason:", err.reason);
        process.exit(1);
    });

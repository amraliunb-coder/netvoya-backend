const mongoose = require('mongoose');

const MONGO_URI = "mongodb+srv://AMR:Bonkai30!!!@cluster0.fxdecqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const mappingSchema = new mongoose.Schema({
    vendor_package_id: String,
    name: String,
    region: String,
    data_limit_gb: Number,
    duration_days: Number,
    wholesale_cost: Number,
    retail_price: { type: Number, default: 0 },
    is_live: { type: Boolean, default: false }
}, { collection: 'esim_product_mappings' });

const EsimProductMapping = mongoose.model('EsimProductMapping', mappingSchema);

async function activatePackages() {
    try {
        console.log('📡 Connecting to Production DB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const result = await EsimProductMapping.updateMany({}, { $set: { is_live: true } });
        console.log(`✅ Updated ${result.modifiedCount} packages to Live.`);

        const count = await EsimProductMapping.countDocuments({ is_live: true });
        console.log(`📊 Total Live Packages: ${count}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

activatePackages();

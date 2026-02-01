const mongoose = require('mongoose');

// Use the Vercel production DB (atlas-green-ball)
const MONGO_URI = "mongodb+srv://Vercel-Admin-atlas-green-ball:NetVoya2024Secure@atlas-green-ball.iodcveu.mongodb.net/?retryWrites=true&w=majority";

const mappingSchema = new mongoose.Schema({
    vendor_package_id: String,
    name: String,
    region: String,
    data_limit_gb: Number,
    duration_days: Number,
    wholesale_cost: Number,
    retail_price: { type: Number, default: 0 },
    is_live: { type: Boolean, default: true }
}, { collection: 'esim_product_mappings', timestamps: true });

const EsimProductMapping = mongoose.model('EsimProductMapping', mappingSchema);

// Package data from spreadsheet - 30 day validity unless specified
const packages = [
    // Egypt
    { name: "Egypt 1GB", region: "Egypt", data_limit_gb: 1, duration_days: 30, retail_price: 5 },
    { name: "Egypt 3GB", region: "Egypt", data_limit_gb: 3, duration_days: 30, retail_price: 14 },
    { name: "Egypt 5GB", region: "Egypt", data_limit_gb: 5, duration_days: 30, retail_price: 22.5 },
    { name: "Egypt 10GB", region: "Egypt", data_limit_gb: 10, duration_days: 30, retail_price: 38 },
    { name: "Egypt 20GB", region: "Egypt", data_limit_gb: 20, duration_days: 30, retail_price: 48.5 },

    // Italy
    { name: "Italy 1GB", region: "Italy", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
    { name: "Italy 3GB", region: "Italy", data_limit_gb: 3, duration_days: 30, retail_price: 9.5 },
    { name: "Italy 5GB", region: "Italy", data_limit_gb: 5, duration_days: 30, retail_price: 14 },
    { name: "Italy 10GB", region: "Italy", data_limit_gb: 10, duration_days: 30, retail_price: 23.5 },
    { name: "Italy 20GB", region: "Italy", data_limit_gb: 20, duration_days: 30, retail_price: 32.5 },

    // Jordan
    { name: "Jordan 1GB", region: "Jordan", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
    { name: "Jordan 3GB", region: "Jordan", data_limit_gb: 3, duration_days: 30, retail_price: 11.5 },
    { name: "Jordan 5GB", region: "Jordan", data_limit_gb: 5, duration_days: 30, retail_price: 17.5 },
    { name: "Jordan 10GB", region: "Jordan", data_limit_gb: 10, duration_days: 30, retail_price: 29.5 },
    { name: "Jordan 20GB", region: "Jordan", data_limit_gb: 20, duration_days: 30, retail_price: 48.5 },

    // KSA: Hajj Package (special)
    { name: "KSA: Hajj 1GB", region: "Saudi Arabia", data_limit_gb: 1, duration_days: 30, retail_price: 7 },
    { name: "KSA: Hajj 2GB", region: "Saudi Arabia", data_limit_gb: 2, duration_days: 30, retail_price: 14.99 },
    { name: "KSA: Hajj 3GB", region: "Saudi Arabia", data_limit_gb: 3, duration_days: 30, retail_price: 19.99 },

    // Morocco
    { name: "Morocco 1GB", region: "Morocco", data_limit_gb: 1, duration_days: 30, retail_price: 6 },
    { name: "Morocco 3GB", region: "Morocco", data_limit_gb: 3, duration_days: 30, retail_price: 17.5 },
    { name: "Morocco 5GB", region: "Morocco", data_limit_gb: 5, duration_days: 30, retail_price: 27.5 },
    { name: "Morocco 10GB", region: "Morocco", data_limit_gb: 10, duration_days: 30, retail_price: 41.5 },
    { name: "Morocco 20GB", region: "Morocco", data_limit_gb: 20, duration_days: 30, retail_price: 59.5 },

    // Oman
    { name: "Oman 1GB", region: "Oman", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
    { name: "Oman 3GB", region: "Oman", data_limit_gb: 3, duration_days: 30, retail_price: 9 },
    { name: "Oman 5GB", region: "Oman", data_limit_gb: 5, duration_days: 30, retail_price: 13.5 },
    { name: "Oman 10GB", region: "Oman", data_limit_gb: 10, duration_days: 30, retail_price: 23.5 },
    { name: "Oman 20GB", region: "Oman", data_limit_gb: 20, duration_days: 30, retail_price: 37.5 },

    // Tunisia
    { name: "Tunisia 1GB", region: "Tunisia", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
    { name: "Tunisia 3GB", region: "Tunisia", data_limit_gb: 3, duration_days: 30, retail_price: 8 },
    { name: "Tunisia 5GB", region: "Tunisia", data_limit_gb: 5, duration_days: 30, retail_price: 11.5 },
    { name: "Tunisia 10GB", region: "Tunisia", data_limit_gb: 10, duration_days: 30, retail_price: 19.5 },
    { name: "Tunisia 20GB", region: "Tunisia", data_limit_gb: 20, duration_days: 30, retail_price: 31 },

    // Turkey
    { name: "Turkey 1GB", region: "Turkey", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
    { name: "Turkey 3GB", region: "Turkey", data_limit_gb: 3, duration_days: 30, retail_price: 7.5 },
    { name: "Turkey 5GB", region: "Turkey", data_limit_gb: 5, duration_days: 30, retail_price: 11.5 },
    { name: "Turkey 10GB", region: "Turkey", data_limit_gb: 10, duration_days: 30, retail_price: 17.5 },
    { name: "Turkey 20GB", region: "Turkey", data_limit_gb: 20, duration_days: 30, retail_price: 25.5 },

    // United Arab Emirates
    { name: "UAE 1GB", region: "United Arab Emirates", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
    { name: "UAE 3GB", region: "United Arab Emirates", data_limit_gb: 3, duration_days: 30, retail_price: 8.5 },
    { name: "UAE 5GB", region: "United Arab Emirates", data_limit_gb: 5, duration_days: 30, retail_price: 11.5 },
    { name: "UAE 10GB", region: "United Arab Emirates", data_limit_gb: 10, duration_days: 30, retail_price: 19.5 },
    { name: "UAE 20GB", region: "United Arab Emirates", data_limit_gb: 20, duration_days: 30, retail_price: 33.5 },

    // United Kingdom
    { name: "UK 1GB", region: "United Kingdom", data_limit_gb: 1, duration_days: 30, retail_price: 4 },
    { name: "UK 3GB", region: "United Kingdom", data_limit_gb: 3, duration_days: 30, retail_price: 8.5 },
    { name: "UK 5GB", region: "United Kingdom", data_limit_gb: 5, duration_days: 30, retail_price: 14.5 },
    { name: "UK 10GB", region: "United Kingdom", data_limit_gb: 10, duration_days: 30, retail_price: 22 },
    { name: "UK 20GB", region: "United Kingdom", data_limit_gb: 20, duration_days: 30, retail_price: 35.5 },
];

async function seedPackages() {
    try {
        console.log('📡 Connecting to Production DB (Vercel)...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        let created = 0;
        let updated = 0;

        for (const pkg of packages) {
            // Generate a unique vendor_package_id
            const vendor_id = `pkg_${pkg.region.toLowerCase().replace(/[^a-z]/g, '')}_${pkg.data_limit_gb}gb`;

            // Calculate wholesale cost (assume 60% margin)
            const wholesale_cost = Math.round(pkg.retail_price * 0.6 * 100) / 100;

            const result = await EsimProductMapping.findOneAndUpdate(
                { name: pkg.name },
                {
                    $set: {
                        vendor_package_id: vendor_id,
                        name: pkg.name,
                        region: pkg.region,
                        data_limit_gb: pkg.data_limit_gb,
                        duration_days: pkg.duration_days,
                        retail_price: pkg.retail_price,
                        wholesale_cost: wholesale_cost,
                        is_live: true,
                        last_sync: new Date()
                    }
                },
                { upsert: true, new: true }
            );

            if (result.createdAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
                created++;
            } else {
                updated++;
            }
        }

        console.log(`\n✅ Seeding complete!`);
        console.log(`   📦 Created: ${created} new packages`);
        console.log(`   🔄 Updated: ${updated} existing packages`);

        const total = await EsimProductMapping.countDocuments();
        const live = await EsimProductMapping.countDocuments({ is_live: true });
        console.log(`\n📊 Total packages in DB: ${total} (${live} live)`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedPackages();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EsimProductMapping from './models/EsimProductMapping.js';
import esimVendorService from './services/esimVendorService.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function syncPackages() {
    try {
        console.log('🔄 Starting package sync...');

        if (!MONGO_URI) {
            throw new Error('MONGO_URI is not defined.');
        }

        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const vendorPackages = await esimVendorService.getPackages();
        console.log(`📦 Fetched ${vendorPackages.length} packages from vendor`);

        for (const pkg of vendorPackages) {
            const existingMapping = await EsimProductMapping.findOne({ vendor_package_id: pkg.id });

            if (existingMapping) {
                // Update wholesale cost but keep our retail price & status
                existingMapping.wholesale_cost = pkg.price;
                existingMapping.name = pkg.name;
                existingMapping.region = pkg.region;
                existingMapping.data_limit_gb = pkg.data_limit_gb;
                existingMapping.duration_days = pkg.duration_days;
                existingMapping.last_sync = new Date();
                await existingMapping.save();
                console.log(`✅ Updated: ${pkg.name} (${pkg.id})`);
            } else {
                // New package - set a default retail price and mark as DRAFT
                const newMapping = new EsimProductMapping({
                    vendor_package_id: pkg.id,
                    retail_price: Math.ceil(pkg.price * 1.5), // 50% markup default
                    wholesale_cost: pkg.price,
                    name: pkg.name,
                    region: pkg.region,
                    data_limit_gb: pkg.data_limit_gb,
                    duration_days: pkg.duration_days,
                    is_live: false // Default to Draft
                });
                await newMapping.save();
                console.log(`✨ Created DRAFT: ${pkg.name} (${pkg.id})`);
            }
        }

        console.log('🎉 Sync completed successfully!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Sync Error:', error.message);
        process.exit(1);
    }
}

syncPackages();

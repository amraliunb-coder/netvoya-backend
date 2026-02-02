import mongoose from 'mongoose';
import dotenv from 'dotenv';
import EsimProductMapping from '../models/EsimProductMapping.js';
import esimVendorService from '../services/esimVendorService.js';

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
        // Console log already in service

        let inserted = 0;
        let updated = 0;

        for (const pkg of vendorPackages) {
            // Extract region from coverage if available
            const region = (pkg.coverage && pkg.coverage.length > 0) ? pkg.coverage[0].country_name : 'Global';

            // 1. Try to find by ID
            let existingMapping = await EsimProductMapping.findOne({ vendor_package_id: pkg.id });

            // 2. Fallback: Try to find by Name (to merge seeded data)
            if (!existingMapping) {
                existingMapping = await EsimProductMapping.findOne({ name: pkg.name });
                if (existingMapping) {
                    console.log(`🔗 Merging seeded package '${pkg.name}' (Old ID: ${existingMapping.vendor_package_id}) -> New ID: ${pkg.id}`);
                    // Update the ID to the real one
                    existingMapping.vendor_package_id = pkg.id;
                }
            }

            if (existingMapping) {
                // Update key fields
                existingMapping.wholesale_cost = pkg.price;
                existingMapping.name = pkg.name;
                existingMapping.region = region;
                // existingMapping.data_limit_gb = pkg.data_quantity; 
                // data_quantity is sometimes string/number, safe cast?
                existingMapping.data_limit_gb = pkg.data_quantity;
                existingMapping.duration_days = pkg.package_validity;
                existingMapping.last_sync = new Date();
                await existingMapping.save();
                updated++;
            } else {
                // Create new draft mapping
                const newMapping = new EsimProductMapping({
                    vendor_package_id: pkg.id,
                    retail_price: Number((pkg.price * 1.5).toFixed(2)), // 50% markup
                    wholesale_cost: pkg.price,
                    name: pkg.name,
                    region: region,
                    data_limit_gb: pkg.data_quantity,
                    duration_days: pkg.package_validity,
                    is_live: false, // Default to Draft
                    last_sync: new Date()
                });
                await newMapping.save();
                inserted++;
            }
        }

        console.log(`\n✅ Sync Complete!`);
        console.log(`   📦 Inserted: ${inserted} new packages`);
        console.log(`   🔄 Updated: ${updated} existing packages`);

        console.log('🎉 Sync completed successfully!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Sync Error:', error.message);
        process.exit(1);
    }
}

syncPackages();

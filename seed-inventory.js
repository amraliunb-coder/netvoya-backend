import mongoose from 'mongoose';
import InventoryBucket from './models/InventoryBucket.js';
import EsimProfile from './models/EsimProfile.js';
import EsimProductMapping from './models/EsimProductMapping.js';

const uri = 'mongodb+srv://AMR:Bonkai30!!!@cluster0.fxdecqe.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const partnerId = '697fa626b49471879b490845';

async function run() {
    await mongoose.connect(uri);
    console.log('✅ Connected');

    const packages = await EsimProductMapping.find({ is_live: true });
    console.log(`Found ${packages.length} live packages`);

    for (const pkg of packages) {
        const bucket = await InventoryBucket.create({
            partner_id: new mongoose.Types.ObjectId(partnerId),
            package_id: pkg._id,
            package_name: pkg.name,
            region: pkg.region,
            data_limit_gb: pkg.data_limit_gb,
            duration_days: pkg.duration_days,
            total_purchased: 50,
            assigned_count: 12, // Preset some assigned for visual variety
            available_count: 38
        });

        const profiles = [];
        // Create 38 available
        for (let i = 0; i < 38; i++) {
            profiles.push({
                bucket_id: bucket._id,
                iccid: `89000${Math.random().toString().slice(2, 12)}`,
                activation_code: `ACT-${Math.random().toString(36).substring(7).toUpperCase()}`,
                qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=NetVoya-eSIM-Test',
                status: 'Available'
            });
        }
        // Create 12 assigned
        for (let i = 0; i < 12; i++) {
            profiles.push({
                bucket_id: bucket._id,
                iccid: `89000${Math.random().toString().slice(2, 12)}`,
                activation_code: `ACT-${Math.random().toString(36).substring(7).toUpperCase()}`,
                qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=NetVoya-eSIM-Test',
                status: 'Assigned',
                assigned_to_name: 'Employee Test',
                assigned_to_email: 'employee@test.com',
                assignment_date: new Date()
            });
        }
        await EsimProfile.insertMany(profiles);
        console.log(`✨ Seeded ${pkg.name}`);
    }

    await mongoose.connection.close();
}
run();

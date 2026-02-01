import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryBucket extends Document {
    partner_id: mongoose.Types.ObjectId;
    package_id: mongoose.Types.ObjectId;
    package_name: string;
    region: string;
    data_limit_gb: number;
    duration_days: number;
    total_purchased: number;
    assigned_count: number;
    available_count: number;
    createdAt: Date;
}

const InventoryBucketSchema: Schema = new Schema({
    partner_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    package_id: { type: Schema.Types.ObjectId, ref: 'EsimProductMapping', required: true },
    package_name: { type: String, required: true },
    region: { type: String, required: true },
    data_limit_gb: { type: Number, required: true },
    duration_days: { type: Number, required: true },
    total_purchased: { type: Number, required: true, default: 0 },
    assigned_count: { type: Number, required: true, default: 0 },
    available_count: { type: Number, required: true, default: 0 },
    createdAt: { type: Date, default: Date.now },
}, {
    timestamps: true
});

export default mongoose.model<IInventoryBucket>('InventoryBucket', InventoryBucketSchema, 'inventory_buckets');

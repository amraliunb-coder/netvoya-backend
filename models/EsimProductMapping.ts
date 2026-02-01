import mongoose, { Schema, Document } from 'mongoose';

export interface IEsimProductMapping extends Document {
    vendor_package_id: string;
    retail_price: number;
    wholesale_cost: number;
    name: string;
    region: string;
    data_limit_gb: number;
    duration_days: number;
    last_sync: Date;
}

const EsimProductMappingSchema: Schema = new Schema({
    vendor_package_id: { type: String, required: true, unique: true },
    retail_price: { type: Number, required: true },
    wholesale_cost: { type: Number, required: true },
    name: { type: String, required: true },
    region: { type: String, required: true },
    data_limit_gb: { type: Number, required: true },
    duration_days: { type: Number, required: true },
    last_sync: { type: Date, default: Date.now },
}, {
    timestamps: true
});

export default mongoose.model<IEsimProductMapping>('EsimProductMapping', EsimProductMappingSchema, 'esim_product_mappings');

import mongoose, { Schema, Document } from 'mongoose';

export interface IEsimProfile extends Document {
    bucket_id: mongoose.Types.ObjectId;
    iccid: string;
    activation_code: string;
    qr_code_url: string;
    status: 'Available' | 'Assigned' | 'Active' | 'Expired';
    assigned_to_name?: string;
    assigned_to_email?: string;
    assignment_date?: Date;
}

const EsimProfileSchema: Schema = new Schema({
    bucket_id: { type: Schema.Types.ObjectId, ref: 'InventoryBucket', required: true },
    iccid: { type: String, required: true, unique: true },
    activation_code: { type: String, required: true },
    qr_code_url: { type: String, required: true },
    status: {
        type: String,
        enum: ['Available', 'Assigned', 'Active', 'Expired'],
        default: 'Available'
    },
    assigned_to_name: { type: String },
    assigned_to_email: { type: String },
    assignment_date: { type: Date },
}, {
    timestamps: true
});

export default mongoose.model<IEsimProfile>('EsimProfile', EsimProfileSchema, 'esim_profiles');

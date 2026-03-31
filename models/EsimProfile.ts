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
    // Email delivery audit
    email_sent?: boolean;
    email_sent_at?: Date;
    email_message_id?: string;
    email_error?: string;
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
    // Email delivery audit
    email_sent: { type: Boolean },
    email_sent_at: { type: Date },
    email_message_id: { type: String },
    email_error: { type: String },
}, {
    timestamps: true
});

export default mongoose.model<IEsimProfile>('EsimProfile', EsimProfileSchema, 'esim_profiles');

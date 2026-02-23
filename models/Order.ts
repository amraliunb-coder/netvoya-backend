import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderPackage {
    name: string;
    region: string;
    quantity: number;
    price: number;
    total: number;
}

export interface IOrder extends Document {
    partner_id: mongoose.Types.ObjectId;
    partner_name: string;
    partner_email: string;
    totalTokens: number;
    totalAmount: number;
    discountLabel: string | null;
    packages: IOrderPackage[];
    status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled';
    createdAt: Date;
    updatedAt: Date;
}

const OrderSchema = new Schema({
    partner_id: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    partner_name: { type: String, required: true },
    partner_email: { type: String, required: true },
    totalTokens: { type: Number, required: true },
    totalAmount: { type: Number, required: true },
    discountLabel: { type: String, default: null },
    packages: [{
        name: { type: String, required: true },
        region: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        total: { type: Number, required: true }
    }],
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Cancelled'],
        default: 'Pending'
    }
}, {
    timestamps: true
});

export default mongoose.model<IOrder>('Order', OrderSchema);

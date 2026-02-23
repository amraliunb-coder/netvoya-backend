import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderPackage {
    name: string;
    region: string;
    quantity: number;
    cost: number;
    price: number;
    totalCost: number;
    total: number;
    profit: number;
}

export interface IOrder extends Document {
    partner_id: mongoose.Types.ObjectId;
    partner_name: string;
    partner_email: string;
    totalTokens: number;
    totalCost: number;
    totalAmount: number;
    totalProfit: number;
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
    totalCost: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    totalProfit: { type: Number, default: 0 },
    discountLabel: { type: String, default: null },
    packages: [{
        name: { type: String, required: true },
        region: { type: String, required: true },
        quantity: { type: Number, required: true },
        cost: { type: Number, default: 0 },
        price: { type: Number, required: true },
        totalCost: { type: Number, default: 0 },
        total: { type: Number, required: true },
        profit: { type: Number, default: 0 }
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

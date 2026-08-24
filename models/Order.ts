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
    partner_id?: mongoose.Types.ObjectId;
    partner_name: string;
    partner_email: string;
    isClientRequest?: boolean;
    client_name?: string;
    client_email?: string;
    agency_id?: string;
    agency_name?: string;
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
    isClientRequest: { type: Boolean, default: false },
    client_name: { type: String },
    client_email: { type: String },
    agency_id: { type: String },
    agency_name: { type: String },
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

OrderSchema.index({ partner_id: 1, createdAt: -1 });
OrderSchema.index({ isClientRequest: 1, createdAt: -1 });

export default mongoose.model<IOrder>('Order', OrderSchema);

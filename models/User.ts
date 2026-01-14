import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
    username: string;
    email: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
    vatId?: string;
    role: 'partner' | 'admin';
    createdAt: Date;
}

const UserSchema: Schema = new Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String },
    lastName: { type: String },
    companyName: { type: String },
    address: { type: String },
    city: { type: String },
    zip: { type: String },
    country: { type: String },
    vatId: { type: String },
    role: { type: String, enum: ['partner', 'admin'], default: 'partner' }, // Default is 'partner'
}, {
    timestamps: true // Automatically adds createdAt and updatedAt
});

export default mongoose.model<IUser>('User', UserSchema, 'users');

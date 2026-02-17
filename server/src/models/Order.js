import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
    {
        key: { type: String, required: true },
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        slug: { type: String, trim: true },
        title: { type: String, trim: true, required: true },
        image: { type: String, trim: true },
        price: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'USD' },
        qty: { type: Number, required: true, min: 1, max: 99 },
        colorName: { type: String, trim: true },
        colorHex: { type: String, trim: true },
    },
    { _id: false }
);

const addressSchema = new mongoose.Schema(
    {
        country: { type: String, trim: true, required: true },
        firstName: { type: String, trim: true, required: true },
        lastName: { type: String, trim: true, required: true },
        address1: { type: String, trim: true, required: true },
        address2: { type: String, trim: true },
        city: { type: String, trim: true, required: true },
        postalCode: { type: String, trim: true },
        phone: { type: String, trim: true },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        contact: {
            emailOrPhone: { type: String, trim: true, required: true },
            email: { type: String, trim: true, lowercase: true },
        },
        shippingAddress: addressSchema,
        billingAddress: addressSchema,
        paymentMethod: { type: String, enum: ['cod', 'bank'], default: 'cod' },
        items: { type: [orderItemSchema], default: [] },
        subtotal: { type: Number, required: true, min: 0 },
        shipping: { type: Number, required: true, min: 0 },
        discount: { type: Number, required: true, min: 0 },
        total: { type: Number, required: true, min: 0 },
        currency: { type: String, default: 'USD' },
        status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    },
    { timestamps: true }
);

export const Order = mongoose.model('Order', orderSchema);

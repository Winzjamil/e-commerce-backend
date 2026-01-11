import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true },
  size: { type: [String], default: [] },
  quantity: Number,
  description: String,
  category: String,
  images: [String],
  storeProfile: String,
  storeName: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const cartsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  image: String,
  price: { type: Number, required: true },
  unitPrice: { type: Number, requred: true },
  quantity: Number,
  description: String,
  stock: Number,
  size: String,
  storeProfile: String,
  storeName: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const orderItemSchema = new mongoose.Schema({
  id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },

  title: {
    type: String,
    required: true,
  },

  image: String,

  price: {
    type: Number,
    required: true,
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },

  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    // who placed the order
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
    },

    shippingAddress: {
      fullName: String,
      region: String,
      phone: { type: Number, required: true },
      city: String,
      province: String,
      street: { type: String, default: '' },
      postalCode: { type: String, default: null },
    },

    paymentMethod: {
      type: String,
      enum: ['COD', 'GCash', 'Card'],
      default: 'COD',
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },

    orderStatus: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },

    totalPrice: {
      type: Number,
      required: true,
    },

    paidAt: Date,
    deliveredAt: Date,

    notes: String,
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      minlength: 2,
      maxlength: 25,
    },
    role: {
      type: String,
      enum: ['user', , 'seller', 'admin'],
      default: 'user',
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      // trim: true,
      match: [/.+\@.+\..+/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    storeName: String,
    account: Number,
    isApprove: { type: Boolean },

    profile: {
      type: String,
      default: '',
    },
    lastSeen: { type: Date },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const addressSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  region: String,
  phone: { type: Number, required: true },
  province: String,
  barangay: String,
  city: String,
  street: { type: String, default: null },
  postalCode: { type: String, default: null },
  isDefault: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
});

const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartsSchema);
const User = mongoose.model('User', userSchema);
const Address = mongoose.model('Address', addressSchema);
const Order = mongoose.model('Order', orderSchema);

export { Product, Cart, User, Address, Order };

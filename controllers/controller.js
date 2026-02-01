// import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import {
  User,
  Product,
  Address,
  Order,
  Cart,
  Activity,
} from '../models/model.js';
import { ADMIN_ACCESS, isOnline } from '../enums/index.js';
import { USER_ACCESS, SELLER_ACCESS } from '../enums/index.js';
import transporter from '../config/mailer.js';

const SECRET_KEY = process.env.TOKEN_SECRET;

export const register = async (req, res) => {
  try {
    const { userName, email, password, role, storeName, account, profile } =
      req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    let newUser;
    req.body && req.body.role && role === SELLER_ACCESS
      ? (newUser = new User({
          userName,
          email,
          password: hashedPassword,
          role,
          storeName,
          account,
          profile,
          isApprove: false,
          isBlocked: false,
        }))
      : (newUser = new User({
          userName,
          email,
          password: hashedPassword,
          profile,
          isBlocked: false,
        }));

    await newUser.save();
    res.status(200).json({ message: 'account created sucessfully' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};

export const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, SECRET_KEY, {
    expiresIn: '15m',
  });
};

export const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, {
    expiresIn: '7d',
  });
};
// Refresh token controller
export const refreshTokenController = (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No refresh token' });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    const newAccessToken = generateAccessToken({
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    });

    return res.json({ accessToken: newAccessToken });
  } catch (err) {
    return res
      .status(403)
      .json({ message: 'Refresh token expired or invalid' });
  }
};
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'user get successfully', user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'invalid email or password' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'invalid email or password ' });
    }

    user.lastSeen = Date.now();
    await user.save();

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',

      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ message: 'token get successfully ', token });
  } catch (err) {
    res.status(500).json({ message: 'internal service error' || err.message });
  }
};

export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { lastSeen: new Date(0) });
    res.json('logout successfully');
  } catch (err) {
    res
      .status(500)
      .json({ message: 'internal server error', error: err.message });
  }
};

export const getUserList = async (req, res) => {
  try {
    const users = await User.find(
      {
        $or: [{ role: USER_ACCESS }, { role: SELLER_ACCESS, isApprove: true }],
      },
      '_id userName role email lastSeen isApprove',
    ).lean();

    const mappedUsers = users.map((user) => ({
      ...user,
      isOnline: isOnline(user.lastSeen),
    }));

    res.status(200).json({
      message: 'Users fetched successfully',
      data: mappedUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

export const getAll = (model) => async (req, res) => {
  const docs = await model.find();

  if (!docs || docs.length <= 0) {
    return res.status(404).json({ message: `products not found` });
  }
  res.status(200).json({
    message: `items fetched successfully`,
    data: docs,
  });
};

/////////////////////////<<<<<<<<<PATCH>>>>>>>>>>///////////////////
export const setDefaultAddress = async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.id,
    owner: req.user.id,
  });

  if (!address) {
    return res.status(404).json({
      message: 'Address not found',
    });
  }
  // to clear default address when user select another address as default
  await Address.updateMany({ owner: req.user.id }, { isDefault: false });

  address.isDefault = true;
  await address.save();

  res.status(200).json({
    message: 'Default address updated',
    data: address,
  });
};

export const placeOrder = async (req, res) => {
  const { items, shippingAddress, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'No items to order' });
  }

  let orderItems = [];
  let totalPrice = 0;

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.stock < item.qty) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    orderItems.push({
      productId: product._id,
      title: product.title,
      paymentMethod: paymentMethod,
      price: product.price,
      quantity: item.quantity,
      seller: product.owner,
      image: item.image,
    });
    totalPrice += product.price * item.quantity;
  }
  const order = await Order.create({
    owner: req.user.id,
    shippingAddress: shippingAddress,
    items: orderItems,
    totalPrice,
    paymentStatus: 'pending',
    orderStatus: 'pending',
  });

  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: -item.quantity },
    });
  }

  await Cart.deleteMany({
    owner: req.user.id,
    _id: { $in: orderItems.map((i) => i.productId) },
  });

  res.status(201).json({
    message: 'Order placed successfully',
    data: order,
  });
};

export const getMyOrders = async (req, res) => {
  const userId = req.user.id;

  switch (req.user.role) {
    case ADMIN_ACCESS: {
      const allOrders = await Order.find();
      if (!allOrders.length) {
        return res.status(404).json({ message: 'No orders found' });
      }
      return res.status(200).json({ data: allOrders });
    }

    case SELLER_ACCESS: {
      const orders = await Order.find({ 'items.seller': userId });

      const sellerOrders = orders.map((order) => {
        const sellerItems = order.items.filter(
          (item) => item.seller.toString() === userId,
        );

        return {
          _id: order._id,
          items: sellerItems,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
          createdAt: order.createdAt,
        };
      });

      return res.status(200).json({ data: sellerOrders });
    }
    default: {
      // normal user
      const orders = await Order.find({ owner: userId });
      return res.status(200).json({ data: orders });
    }
  }
};

export const getPSGC = async (req, res) => {
  const { type, regionCode, provinceCode, cityCode } = req.query;

  const map = {
    regions: 'https://psgc.rootscratch.com/region',
    provinces: regionCode
      ? `https://psgc.rootscratch.com/province?id=${regionCode}`
      : null,
    cities: provinceCode
      ? `https://psgc.rootscratch.com/city?id=${provinceCode}`
      : null,
    barangays: cityCode
      ? `https://psgc.rootscratch.com/barangay?id=${cityCode}`
      : null,
  };

  if (!map[type]) {
    return res.status(400).json({ message: 'Invalid type or missing code' });
  }
  try {
    const response = await fetch(map[type]);
    const PSGC_Data = await response.json();

    res.status(200).json({ message: 'Fetched successfully', data: PSGC_Data });
  } catch {
    res.status(500).json({ message: 'Failed to fetch PSGC data' });
  }
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({
        message: 'If the email exists, a reset link was sent.',
      });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      text: `Reset your password: ${resetURL}`,
    });

    res.json({ message: 'If the email exists, a reset link was sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// 🔹 Reset Password Route
export const resetPassword = async () => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // token not expired
    });

    if (!user)
      return res.status(400).json({ message: 'Invalid or expired token' });

    user.password = newPassword; // will be hashed by pre-save hook
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
export const createActivity = async ({ owner, action, details, email }) => {
  if (!owner) throw new Error('owner is required for activity');
  await Activity.create({ owner, action, details, email });
};

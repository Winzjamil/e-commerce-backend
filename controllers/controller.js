// import multer from 'multer';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cloudinary from '../cloud_config/cloudConfig.js';
import multer from 'multer';
import { User, Product, Address, Order, Cart } from '../models/Model.js';
import { isOnline } from '../enums/index.js';
import { USER_ACCESS, SELLER_ACCESS } from '../enums/index.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });

const SECRET_KEY = process.env.TOKEN_SECRET;

export const uploadProdImages = [
  upload.array('images', 10),
  async (req, res, next) => {
    try {
      if (!req.files?.length) return next();

      const uploadedImages = await Promise.all(
        req.files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const stream = cloudinary.uploader.upload_stream(
                { folder: 'products' },
                (err, result) => {
                  if (err) return reject(err);
                  resolve(result);
                }
              );
              stream.end(file.buffer);
            })
        )
      );
      req.body.images = uploadedImages.map((img) => img.secure_url);
      next();
    } catch (err) {
      console.error('Failed to upload images:', err.message);
      next(err);
    }
  },
];

export const lastSeenUpdater = async (req, res, next) => {
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, { lastSeen: new Date() });
    next();
  }
};

export const getUserList = async (req, res) => {
  try {
    const doc = await User.find({ role: [USER_ACCESS, SELLER_ACCESS] });
    const updatedDoc = doc.map((d) => ({
      _id: d._id,
      userName: d.userName,
      role: d.role,
      email: d.email,
      isOnline: isOnline(d.lastSeen),
      date: Date.now(),
      isApprove: d.isApprove,
    }));

    const approvedSeller = updatedDoc.filter(
      (d) => d.role === SELLER_ACCESS && d.isApprove === true
    );
    const userRole = updatedDoc.filter((d) => d.role === USER_ACCESS);
    const users = [...userRole, ...approvedSeller];
    res.status(200).json({
      message: 'items fetched successfully',
      data: users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getProduct = async (req, res) => {
  const docs = await Product.find();
  console.log(docs);
  if (!docs) {
    return res.status(404).json({ message: `products not found` });
  }
  res.status(200).json({
    message: `items fetched successfully`,
    data: docs,
  });
};
/////////////////////<<<<<<<<<<POST>>>>>>>>>>>>>>>///////////////////////
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
    const token = jwt.sign({ id: user._id, email: user.email }, SECRET_KEY);

    let newUser;
    isMatch && user.role === SELLER_ACCESS
      ? (newUser = {
          userName: user.userName,
          role: user.role,
          profile: user.profile,
          storeName: user.storeName,
        })
      : (newUser = {
          userName: user.userName,
          role: user.role,
        });

    res.status(200).json({ user: newUser, message: 'login succesfull', token });
  } catch (err) {
    res.status(500).json('internal service error');
  }
};
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
        }))
      : (newUser = new User({
          userName,
          email,
          password: hashedPassword,
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
      id: product._id,
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
      $inc: { stock: -item.qty },
    });
  }

  await Cart.deleteMany({
    owner: req.user.id,
    _id: { $in: orderItems.map((i) => i.id) },
  });

  res.status(201).json({
    message: 'Order placed successfully',
    data: order,
  });
};
export const getOrder = async (req, res) => {
  try {
    const order = await Order.find({ owner: req.user.id });
    const orderItem = [...order].map((item) => item.items);
    if (!order) {
      res.status(400).json({ message: 'no order found ' });
    }
    res.status(200).json({ data: orderItem });
  } catch (err) {
    res.status(400).json({ error: 'internel server error ' || err.message });
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

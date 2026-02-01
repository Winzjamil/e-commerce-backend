import dotenv from 'dotenv';
dotenv.config();
import jwt from 'jsonwebtoken';
import multer from 'multer';
import cloudinary from '../config/cloudConfig.js';
import { User } from '../models/model.js';

const storage = multer.memoryStorage();
const upload = multer({ storage });
const SECRET_KEY = process.env.TOKEN_SECRET;

export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer')) {
    return res.status(401).json({ message: 'Unauthorized. Token missing.' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    console.log('JWT VERIFY FAILED', err.message);
    return res
      .status(403)
      .json({ message: 'Invalid or expired token.' || err.message });
  }
};

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
                },
              );
              stream.end(file.buffer);
            }),
        ),
      );
      req.body.images = uploadedImages.map((img) => img.secure_url);
      next();
    } catch (err) {
      console.error('Failed to upload images:', err.message);
      next(err);
    }
  },
];
export const uploadProfileImage = [
  upload.single('profile'),
  async (req, res, next) => {
    try {
      if (!req.file) return next();

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          // options paramater
          { folder: 'profiles' },
          // callback function
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });

      req.body.profile = result.secure_url;
      next();
    } catch (err) {
      console.error('Failed to upload profile image:', err.message);
      next(err);
    }
  },
];

export const lastSeenUpdater = async (req, res, next) => {
  if (req.user?.id) {
    await User.findByIdAndUpdate(req.user.id, {
      lastSeen: Date.now(),
    });
    next();
  }
};
// utils/formatDateTime.js

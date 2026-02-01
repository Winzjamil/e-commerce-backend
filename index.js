import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { crudePretectedRoutes } from './routes/CrudeRoutes.js';
import { Product, Cart, Address } from './models/model.js';
import seedAdmin from './seedAdmin.js';
import userRoutes from './routes/usersRoutes.js';
import cookieParser from 'cookie-parser';
import {
  authMiddleware,
  uploadProdImages,
  lastSeenUpdater,
} from './my-auth/middleware.js';

const Myapp = express();

Myapp.use(cookieParser());
Myapp.use(express.json());
Myapp.use(express.urlencoded({ extended: true }));

const frontendUrl = process.env.LOCAL_FRONT_URL || process.env.PROD_FRONT_URL;

const uri = process.env.MONGO_URI || process.env.ATLAS_URI;

Myapp.use(
  cors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
);

Myapp.use(
  '/product',
  crudePretectedRoutes({
    model: Product,
    middleWare: {
      create: [authMiddleware, lastSeenUpdater, uploadProdImages],
      remove: [authMiddleware, lastSeenUpdater],
      getAll: [authMiddleware, lastSeenUpdater],
      update: [authMiddleware, lastSeenUpdater],
    },
  }),
);
Myapp.use(
  '/cart',
  crudePretectedRoutes({
    model: Cart,
    middleWare: {
      getAll: [authMiddleware, lastSeenUpdater],
      create: [authMiddleware, lastSeenUpdater],
      remove: [authMiddleware, lastSeenUpdater],
      update: [authMiddleware, lastSeenUpdater],
    },
    activity: {
      create: 'ADD_TO_CART',
      update: 'UPDATE_CART_ITEM',
      remove: 'DELETE_CART_ITEM',
    },
  }),
);
Myapp.use(
  '/address',
  crudePretectedRoutes({
    model: Address,
    middleWare: {
      create: [authMiddleware, lastSeenUpdater],
      remove: [authMiddleware, lastSeenUpdater],
      getAll: [authMiddleware, lastSeenUpdater],
      update: [authMiddleware, lastSeenUpdater],
    },
  }),
);

Myapp.use(userRoutes);

// global error catcher
Myapp.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: err.message || 'something went wrong body ' });
});

const serverStarter = async () => {
  try {
    if (!uri) {
      console.log(' MongoDB URI is missing! Check your env variables.');
    }
    await mongoose.connect(uri);
    console.log('mongoDb connected');
    await seedAdmin();

    Myapp.listen(process.env.PORT, () => {
      console.log(`App is running on port ${process.env.PORT} love2x`);
    });
  } catch (err) {
    console.error('Server start error:', err);
    process.exit(1);
  }
};
serverStarter();

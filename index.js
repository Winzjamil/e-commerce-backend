import dotenv from 'dotenv';
dotenv.config();
import './cloud_config/cloudConfig.js';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { lastSeenUpdater } from './controllers/controller.js';
import { crudePretectedRoutes } from './routes/CrudeRoutes.js';
import { Product, Cart, Address, Order } from './models/Model.js';
import { uploadProdImages } from './controllers/controller.js';
import { authMiddleware } from './my-auth/Mddleware.js';
import seedAdmin from './seedAdmin.js';
import userRoutes from './routes/usersRoutes.js';

const Myapp = express();

Myapp.use(express.json());

Myapp.use(express.urlencoded({ extended: true }));
const frontendUrl = process.env.LOCAL_FRONT_URL || process.env.PROD_FRONT_URL;
Myapp.use(
  cors({
    origin: frontendUrl,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

Myapp.use(userRoutes);

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
  })
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
  })
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
  })
);
Myapp.use(
  '/order',
  crudePretectedRoutes({
    model: Order,
    middleWare: {
      getAll: [authMiddleware, lastSeenUpdater],
    },
  })
);

// global error catcher
Myapp.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'something went wrong ' });
});
const uri = process.env.MONGO_URI || process.env.ATLAS_URI;

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

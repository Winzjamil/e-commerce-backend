import express from 'express';
import { Product, Order, Activity } from '../models/model.js';
import {
  getUserList,
  logout,
  login,
  register,
  setDefaultAddress,
  placeOrder,
  getPSGC,
  getMyOrders,
  getAll,
  refreshTokenController,
  getProfile,
} from '../controllers/controller.js';

import {
  lastSeenUpdater,
  authMiddleware,
  uploadProfileImage,
} from '../my-auth/middleware.js';
const router = express.Router();

router.get('/get_psgc', authMiddleware, lastSeenUpdater, getPSGC);
router.get('/order', authMiddleware, lastSeenUpdater, getMyOrders);
router.get('/users/me', authMiddleware, getProfile);

////////////////////<<<<<<<ADMIN ACCESS>>>>>>>///////////
router.get('/product_list', getAll(Product));
router.get('/userActivity', getAll(Activity));
router.get('/users_list', authMiddleware, getUserList);
/////////////////<<<<<<<POST>>>>>>///////////////////////
router.post('/logout', authMiddleware, logout);
router.post('/login', login);
router.post('/register', uploadProfileImage, register);
router.post('/place_order', authMiddleware, lastSeenUpdater, placeOrder);
router.post('/refresh', refreshTokenController);

//////////////////<<<<<<<<<PATCH>>>>>>>>>//////////////////
router.patch(
  '/address/:id/default',
  authMiddleware,
  lastSeenUpdater,
  setDefaultAddress,
);
export default router;

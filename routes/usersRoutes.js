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
} from '../controllers/controller.js';

import {
  lastSeenUpdater,
  authMiddleware,
  uploadProfileImage,
} from '../my-auth/Mddleware.js';
const router = express.Router();

router.get('/users_list', authMiddleware, getUserList);
router.get('/product_list', getAll(Product));
router.get('/userActivity', getAll(Activity));
router.get('/get_psgc', authMiddleware, lastSeenUpdater, getPSGC);
router.get('/order', authMiddleware, lastSeenUpdater, getMyOrders);

/////////////////<<<<<<<POST>>>>>>///////////////////////
router.post('/logout', authMiddleware, logout);
router.post('/login', login);
router.post('/register', uploadProfileImage, register);
router.post('/place_order', authMiddleware, lastSeenUpdater, placeOrder);

//////////////////<<<<<<<<<PATCH>>>>>>>>>//////////////////
router.patch(
  '/address/:id/default',
  authMiddleware,
  lastSeenUpdater,
  setDefaultAddress
);
export default router;

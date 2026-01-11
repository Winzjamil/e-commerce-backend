import express from 'express';
import {
  getUserList,
  getProduct,
  logout,
  login,
  register,
  setDefaultAddress,
  placeOrder,
  getPSGC,
  getOrder,
} from '../controllers/controller.js';
import { authMiddleware } from '../my-auth/Mddleware.js';
import { lastSeenUpdater } from '../controllers/controller.js';

const router = express.Router();
router.get('/users_list', authMiddleware, getUserList);
router.get('/product_list', getProduct);
router.get('/get_psgc', authMiddleware, lastSeenUpdater, getPSGC);
// router.get('/order', authMiddleware, lastSeenUpdater, getOrder);

/////////////////<<<<<<<POST>>>>>>///////////////////////
router.post('/logout', authMiddleware, logout);
router.post('/login', login);
router.post('/register', register);
router.post('/place_order', authMiddleware, lastSeenUpdater, placeOrder);

//////////////////<<<<<<<<<PATCH>>>>>>>>>//////////////////
router.patch(
  '/address/:id/default',
  authMiddleware,
  lastSeenUpdater,
  setDefaultAddress
);
export default router;

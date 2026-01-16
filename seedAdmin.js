import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcrypt';
import { User } from './models/model.js';
import { ADMIN_ACCESS } from './enums/index.js';

export default async function seedAdmin() {
  const existingAdmin = await User.findOne({ email: process.env.ADMIN_EMAIL });
  if (existingAdmin) return;

  const adminUser = new User({
    userName: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12),
    role: ADMIN_ACCESS,
  });
  await adminUser.save();
}

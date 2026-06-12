/**
 * Test app setup — mirrors index.ts but without starting a server.
 * Each test suite imports this and passes it to supertest.
 */
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';

dotenv.config();

import { inputSanitizer } from '../../middleware/inputSanitizer';
import authRoutes from '../../routes/auth';
import cartRoutes from '../../routes/cart';
import couponRoutes from '../../routes/coupons';
import notificationRoutes from '../../routes/notifications';
import orderRoutes from '../../routes/orders';
import productRoutes from '../../routes/products';
import razorpayRoutes from '../../routes/razorpay';
import userRoutes from '../../routes/users';
import walletRoutes from '../../routes/wallet';
import wishlistRoutes from '../../routes/wishlist';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(inputSanitizer);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/coupons', couponRoutes);
app.use('/api/v1/razorpay', razorpayRoutes);
app.use('/api/v1/notifications', notificationRoutes);

export default app;

import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { cancelBookingController } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';

export default authMiddleware(cancelBookingController);
import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { roomAvailabilityController } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';

export default authMiddleware(roomAvailabilityController);
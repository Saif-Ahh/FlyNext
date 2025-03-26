// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prismaClient';
import { authMiddleware } from '@/middleware/authMiddleware';
import { getRoomAmt } from '@/controllers/hotelController';

async function getRoomCount(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { hotelId, roomType } = req.query;

    if (!hotelId || !roomType) {
        return res.status(400).json({ message: 'Hotel ID and room type are required' });
    }

    try {
        const roomCount = await getRoomAmt(hotelId, roomType);
        return res.status(200).json(roomCount);
    } catch (error) {
        console.error('Error fetching room count:', error);
        return res.status(500).json({ message: 'Error fetching room count' });
    }
}

export default authMiddleware(getRoomCount); 
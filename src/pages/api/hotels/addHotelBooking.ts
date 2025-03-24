import { NextApiRequest, NextApiResponse } from 'next';
import { addHotelBooking } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';
import { AuthenticatedRequest } from '@/middleware/authMiddleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        return await addHotelBooking(req, res);
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}

export default authMiddleware(handler);

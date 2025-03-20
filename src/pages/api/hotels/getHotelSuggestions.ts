import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { getHotelSuggestions, viewDetailedHotel } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return await getHotelSuggestions(req, res);
    } else {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}

export default authMiddleware(handler);
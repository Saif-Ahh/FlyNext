import { NextApiRequest, NextApiResponse } from 'next';
import { addHotelController } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        return await addHotelController(req, res);
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}

export default authMiddleware(handler);

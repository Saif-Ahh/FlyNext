import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { updateRooms } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        // Validate required parameters
        const { hotelId, roomType, newAmount } = req.body;
        
        if (!hotelId || !roomType || newAmount === undefined || newAmount === null) {
            return res.status(400).json({ error: 'Missing required fields: hotelId, roomType, and newAmount are required' });
        }
        
        // Forward to controller
        return await updateRooms(req, res);
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}

export default authMiddleware(handler);

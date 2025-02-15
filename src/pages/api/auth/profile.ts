import { NextApiRequest, NextApiResponse } from 'next';
import { getProfileController, updateProfileController } from '@/controllers/authController';
import { authMiddleware } from '@/middleware/authMiddleware';

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return await getProfileController(req, res);
    } else if (req.method === 'PUT') {
        return await updateProfileController(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}

export default authMiddleware(handler);
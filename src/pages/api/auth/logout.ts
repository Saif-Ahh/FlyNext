import { NextApiRequest, NextApiResponse } from 'next';
import { logoutController } from '@/controllers/authController';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    return await logoutController(req, res);
}
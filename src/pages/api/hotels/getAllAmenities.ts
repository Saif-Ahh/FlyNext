import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { getAllAmenitiesByLocation } from '@/controllers/hotelController';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return await getAllAmenitiesByLocation(req, res);
    } else {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
import { NextApiRequest, NextApiResponse } from 'next';
// @ts-ignore
import { getLowestPriceAllAmenities } from '@/controllers/hotelController';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        return await getLowestPriceAllAmenities(req, res);
    } else {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
}
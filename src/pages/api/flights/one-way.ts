import { NextApiRequest, NextApiResponse } from 'next';
import { getOneWayFlights } from '@/controllers/flightController';
//aided by chatgpt
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    const { source, destination, departureDate } = req.query;

    if (!source || !destination || !departureDate) {
        return res.status(400).json({ error: 'Missing required query parameters: source, destination, departureDate' });
    }

    try {
        const flights = await getOneWayFlights(
            source as string,
            destination as string,
            departureDate as string
        );
        res.status(200).json(flights);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
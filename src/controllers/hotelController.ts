// @ts-nocheck
// controllers/hotelController.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createHotel } from '@/services/hotelService';
import { error } from 'console';


export async function addHotelController(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { name, logo, address, location, starRating, images } = req.body;
        const { userId } = req.user as { userId: string };

        if (!name || !logo || !address || !location || !starRating || !images) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Convert starRating to float number
        const starRatingFloat = parseFloat(starRating);
        if (isNaN(starRatingFloat)) {
            return res.status(400).json({ error: 'Invalid star rating' });
        }

        const newHotel = await createHotel({
            userId,
            name,
            logo,
            address,
            location,
            starRating,
            images,
        });

        return res.status(200).json({ message: 'Hotel added successfully', hotel: newHotel });
    } catch (error) {
        console.error('Error adding hotel:', error);
        return res.status(500).json({ error: 'Error adding hotel' });
    }
}


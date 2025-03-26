// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prismaClient';
import { getLowestRoomPrice } from '@/services/hotelService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) 
{
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {   
        // Return three hotels with the highest rating
        const hotels = await prisma.hotel.findMany({
            orderBy: {
                starRating: 'desc',
            },
            take: 3,
        });

        // Map hotels to return only name, logo, and first image from images array
        const hotelsToReturn = await Promise.all(hotels.map(async (hotel) => {
            // Parse the images JSON if it's a string, or use it directly if it's already an array
            const imagesArray = typeof hotel.images === 'string' 
                ? JSON.parse(hotel.images) 
                : hotel.images;
            
            // Get the first image or use logo as fallback
            const firstImage = Array.isArray(imagesArray) && imagesArray.length > 0 
                ? imagesArray[0] 
                : hotel.logo;
            
            // Get lowest price of room if it exists
            let lowestPrice = await getLowestRoomPrice(hotel.id);
            // if lowest price is null or infinity, set it to 0
            if (lowestPrice === null || lowestPrice === Infinity) {
                lowestPrice = 0;
            }
            
            return {
                name: hotel.name,
                imageUrl: firstImage,
                location: hotel.location,
                starRating: hotel.starRating,
                lowestPrice: lowestPrice
            };
        }));

        return res.status(200).json(hotelsToReturn);
    } catch (error) {
        console.error('Error fetching hotels:', error);
        return res.status(500).json({ error: 'Failed to fetch hotels' });
    }
}

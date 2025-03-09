// @ts-nocheck
// controllers/hotelController.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createHotel, createRoom, isHotelOwner, getRoomObject } from '@/services/hotelService';
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

export async function addRoomTypeController(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {hotelId, roomNum, name, amenities, pricePerNight, images } = req.body;
        const { userId } = req.user as { userId: string };

        if (!hotelId || !name || !amenities || !pricePerNight || !images || !roomNum) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const isOwner = await isHotelOwner(userId, hotelId);
        if (!isOwner) {
            return res.status(403).json({ error: 'You do not have permission to add rooms to this hotel' });
        }

        // Check if there is a room with the same name and number
        const existingRoom = await getRoomObject(hotelId, roomNum);
        if (existingRoom) {
            return res.status(400).json({ error: 'Room number already exists' });
        }

        const newRoomType = await createRoom({
            hotelId,
            roomNum,
            name,
            amenities,
            pricePerNight,  
            images,
        });
    
        return res.status(200).json({ message: 'Room type defined successfully', roomType: newRoomType });
    } catch (error) {
        console.error('Error defining room type:', error);
        return res.status(500).json({ error: 'Error defining room type' });
    }
}


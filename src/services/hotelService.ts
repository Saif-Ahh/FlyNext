// @ts-nocheck
import prisma from '@/utils/prismaClient';

export async function createHotel(hotelData: {
    userId: string;
    name: string;
    logo: string;
    address: string;
    location: string;
    starRating: number;
    images: any;
}) {
    return await prisma.hotel.create({
        data: hotelData,
    });
}
export async function createRoom(roomData: {
    hotelId: string;
    roomNum: string
    name: string;
    amenities: any;
    pricePerNight: number;
    images: any;  
}) {
    return await prisma.room.create({
        // @ts-ignore
        data: roomData,
    }); 
}

export async function getRoomObject(hotelId: string, roomNum: number)
{
    try {
        const room = await prisma.room.findFirst({
            where: {
                hotelId: hotelId,
                roomNum: roomNum,
            },
        });
        return room;
    } catch (error) {
        console.error("Error fetching room:", error);
        return { error: "Failed to retrieve room" };
    }
}

export async function isHotelOwner(userId: string, hotelId: string) {
    try {
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
        });
        return hotel?.userId === userId;
    } catch (error) {
        console.error('Error checking hotel ownership:', error);
        throw new Error('Error verifying hotel owner');
    }
}


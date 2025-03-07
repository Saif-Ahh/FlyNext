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


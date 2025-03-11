import { NextResponse } from 'next/server';
import prisma from '@/utils/prismaClient';

export async function POST(req: Request) {
  try {
    // The request should include a hotelId for associating the room type with a hotel.
    const { hotelId, name, amenities, pricePerNight, images } = await req.json();
// @ts-ignore
    const newRoomType = await prisma.roomType.create({
      data: {
        hotelId,
        name,
        amenities,
        pricePerNight,  
        images,
      },
    });

    return NextResponse.json({ message: 'Room type defined successfully', roomType: newRoomType });
  } catch (error) {
    console.error('Error defining room type:', error);
    return NextResponse.json({ error: 'Error defining room type' }, { status: 500 });
  }
}

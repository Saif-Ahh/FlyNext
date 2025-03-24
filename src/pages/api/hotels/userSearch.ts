// @ts-nocheck
import { NextResponse } from 'next/server';
import prisma from '@/utils/prismaClient';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // get dates fpr checkin, checkout and city
  const checkInDateStr = searchParams.get('checkInDate');
  const checkOutDateStr = searchParams.get('checkOutDate');
  const city = searchParams.get('city');

  // atleast one paramater is missing
  if (!checkInDateStr || !checkOutDateStr || !city) {
    return NextResponse.json(
      { error: 'checkInDate, checkOutDate, and city are required.' },
      { status: 400 }
    );
  }

  // if user gave more filters
  const nameFilter = searchParams.get('name');
  const starRatingStr = searchParams.get('starRating');
  const minPriceStr = searchParams.get('minPrice');
  const maxPriceStr = searchParams.get('maxPrice');

  // change types of parameters so it can be inputted into prisma
  const checkInDate = new Date(checkInDateStr);
  const checkOutDate = new Date(checkOutDateStr);
  const starRating = starRatingStr ? parseFloat(starRatingStr) : undefined;
  const minPrice = minPriceStr ? parseFloat(minPriceStr) : undefined;
  const maxPrice = maxPriceStr ? parseFloat(maxPriceStr) : undefined;

  try {
    // Find hotels by city and other filters
    const hotels = await prisma.hotel.findMany({
      where: {
        // @ts-ignore
        city: { equals: city, mode: 'insensitive' },
        ...(nameFilter && { name: { contains: nameFilter, mode: 'insensitive' } }),
        ...(starRating !== undefined && { starRating }),
      },
    });

    // Go through each hotel and check its' type and availability
    const availableHotels = await Promise.all(
      hotels.map(async (hotel) => {
        // @ts-ignore
        const roomTypes = await prisma.roomType.findMany({
          where: {
            hotelId: hotel.id,
            ...(minPrice !== undefined || maxPrice !== undefined
              ? {
                // check based on price if it was provided
                  pricePerNight: {
                    ...(minPrice !== undefined ? { gte: minPrice } : {}),
                    ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                  },
                }
              : {}),
          },
        });

        // Check availability for hotel
        const availableRoomTypes = await Promise.all(
          // @ts-ignore
          roomTypes.map(async (roomType) => {
            // Count amount of bookings in the date range
            const bookedCount = await prisma.booking.count({
              where: {
                // @ts-ignore
                roomTypeId: roomType.id,
                status: 'CONFIRMED',
                AND: [
                  { checkInDate: { lt: checkOutDate } },
                  { checkOutDate: { gt: checkInDate } },
                ],
              },
            });
            const availableCount = (roomType.totalRooms || 0) - bookedCount;
            return availableCount > 0 ? roomType : null;
          })
        );

        // Filter out room types with no availability
        // @ts-ignore
        const validRoomTypes = availableRoomTypes.filter((rt) => rt !== null);
        if (validRoomTypes.length === 0) {
          return null;
        }

        // Get the lowest prices
        const startingPrice = Math.min(
          // @ts-ignore
          ...validRoomTypes.map((rt) => rt!.pricePerNight)
        );

        return {
          hotelId: hotel.id,
          name: hotel.name,
          address: hotel.address,
          // @ts-ignore
          city: hotel.city,
          starRating: hotel.starRating,
          location: hotel.location, 
          startingPrice,
        };
      })
    );

    // Take out hotels without any room types
    const results = availableHotels.filter((hotel) => hotel !== null);

    return NextResponse.json({ hotels: results });
  } catch (error) {
    console.error('Error searching for hotels:', error);
    return NextResponse.json(
      { error: 'Error searching for hotels' },
      { status: 500 }
    );
  }
}

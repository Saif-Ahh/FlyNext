// @ts-nocheck
import prisma from '@/utils/prismaClient';
import { Prisma } from '@prisma/client';

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

export async function getBookings(hotelId: string, dateIn: string, dateOut: string, roomType: string) {
    const filters: any = {
        hotelId: hotelId,
        status: "Valid",
    };

    if (roomType) filters.roomType = roomType;

    if (dateIn && dateOut) {
        const parsedDateIn = new Date(dateIn);
        const parsedDateOut = new Date(dateOut);
        parsedDateIn.setHours(0, 0, 0, 0); 
        parsedDateOut.setHours(0, 0, 0, 0); 

        // print out dates
        console.log(parsedDateIn, parsedDateOut);
        filters.AND = [
            { checkInDate: { lte: parsedDateOut } }, 
            { checkOutDate: { gte: parsedDateIn } }, 
        ];
    }

    return await prisma.booking.findMany({ where: filters });
}


export async function getBookingById(bookingId: number) {
    try {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          hotel: true,
          room: true
        }
      });
  
      if (!booking) {
        return false;
      }
  
      return {
        ...booking,
        checkIn: booking.checkInDate,
        checkOut: booking.checkOutDate,
      };
    } catch (error) {
      console.error("Error fetching booking:", error);
      return false;
    }
  }
  


export async function cancelBooking(reservationId: number) {
    const existingReservation = await prisma.booking.findUnique({
        where: { id: reservationId },
    });

    if (!existingReservation) {
        throw new Error('Reservation not found');
    }

    const canceledReservation = await prisma.booking.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' },
    });

    // remove reservation from booking list
    await prisma.hotel.update({
        // @ts-ignore
        where: { id: existingReservation.hotelId },
        data: {
            bookings: {
                disconnect: { id: reservationId }, // Remove the booking from the hotel
            },
        },
    });
    return canceledReservation;
}

export async function cancelBookingById(bookingId: number) {
    try {

        const canceledBooking = await prisma.booking.update({
            where: { id: bookingId },
            data: { status: 'CANCELLED' },
        });
        return canceledBooking;
    } catch (error) {
        console.error('Error in cancelBookingById:', error);
        throw new Error('Error cancelling booking');
    }
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

export async function getRoomAvailability(
    hotelId: string, 
    roomType: string, 
    startDate: string, 
    endDate: string
) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const rooms = await prisma.room.findMany({
        where: {
            hotelId: hotelId,
            name: roomType,
        },
        select: { id: true, roomNum: true },
    });

    const bookings = await prisma.booking.findMany({
        where: {
            hotelId: hotelId,
            roomType: roomType,
            status: "Valid",
            AND: [
                { checkInDate: { lt: end } },
                { checkOutDate: { gt: start } },
            ],
        },
        select: { roomNum: true },
    });

    const bookedRoomNums = bookings.map((booking) => booking.roomNum);
    const availableRooms = rooms.filter((room) => !bookedRoomNums.includes(room.roomNum));

    return {
        totalRooms: rooms.length,
        bookedRooms: bookedRoomNums.length,
        availableRooms: availableRooms.length,
    };
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

export async function returnHotelBookings(hotelId: string) {
    try {
        const bookings = await prisma.booking.findMany({
            where: { hotelId: hotelId },
        });
        return bookings;
    } catch (error) {
        console.error("Error fetching hotel bookings:", error);
        return { error: "Failed to retrieve hotel bookings." };
    }
}

export async function returnValidHotelBookings(hotelId: string) {
    try {
        const bookings = await prisma.booking.findMany({
            where: { 
                hotelId: hotelId,
                status: "Valid"
            },
        });
        return bookings;
    } catch (error) {
        console.error("Error fetching hotel bookings:", error);
        return { error: "Failed to retrieve hotel bookings." };
    }
}


export async function getHotel(hotelId: string) {
    try {
        // Find the hotel and include related data
        const hotel = await prisma.hotel.findUnique({
            where: { id: hotelId },
            include: {
                rooms: true, // Include all rooms in the hotel
                bookings: true, // Include all bookings
                notifications: true, // Include all notifications
            },
        });

        if (!hotel) {
            return { error: "Hotel not found." };
        }
        return hotel;
    } catch (error) {
        console.error("Error fetching hotel:", error);
        return { error: "Failed to retrieve hotel details." };
    }
}

export async function findHotelByCity(city: string)
{
    const hotels = await prisma.hotel.findMany({
        where: { location: city },
    });
    return hotels;
}

export async function getBookingByRoomAndDates(roomId: string, checkInDate: Date, checkOutDate: Date) {
    // Check if there is a booking that ends after the current start date and starts before the current end date
    const booking = await prisma.booking.findFirst({
        where: {
            roomId: roomId,
            checkOutDate: { gte: checkInDate },
            checkInDate: { lte: checkOutDate },
            status: "Valid",
        }
    });
    return booking;
}




/**
 * Checks if a hotel's available rooms (within the specified date range)
 * have a cheapest price that is greater than minPrice and a most expensive price
 * that is below maxPrice.
 *
 * @param hotelId - The ID of the hotel to check.
 * @param minPrice - The minimum price threshold.
 * @param maxPrice - The maximum price threshold.
 * @param startDate - The start date of the availability window (YYYY-MM-DD).
 * @param endDate - The end date of the availability window (YYYY-MM-DD).
 * @returns A Promise that resolves to true if the hotel's available room price range meets the criteria; otherwise, false.
 * aided by chatgpt
 */
export async function isHotelRoomPriceInRange(
    hotelId: string,
    minPrice: number,
    maxPrice: number,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    const availableRooms = await prisma.room.findMany({
      where: {
        hotelId,
        NOT: {
          bookings: {
            some: {
              status: "Valid",
              AND: [
                { checkInDate: { lt: end } },
                { checkOutDate: { gt: start } },
              ],
            },
          },
        },
      },
    });
  

    if (availableRooms.length === 0) {
      return false;
    }
  
    const prices = availableRooms.map(room => room.pricePerNight);
    const minAvailable = Math.min(...prices);
    const maxAvailable = Math.max(...prices);
  

    return minAvailable > minPrice && maxAvailable < maxPrice;
  }


  export async function isHotelAboveStarRating(hotelId: string, ratingThreshold: number): Promise<boolean> {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { starRating: true },
    });
  
    if (!hotel) {
      throw new Error('Hotel not found');
    }
  
    return hotel.starRating >= ratingThreshold;
  }


export async function doesHotelNameContainKeyword(
    hotelId: string,
    keyword: string
  ): Promise<boolean> {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true },
    });
  
    if (!hotel) {
      throw new Error('Hotel not found');
    }
  
    return hotel.name.toLowerCase().includes(keyword.toLowerCase());
  }

  /**
 * Returns an array of hotel objects with:
 * 1) All hotel info
 * 2) Starting price (cheapest available room)
 * 3) Only rooms that are available within start_date to end_date
 *
 * Hotels without any available rooms in the date range are excluded.
 *
 * @param hotelIds - An array of hotel IDs to look up.
 * @param start_date - The start date of the availability window (YYYY-MM-DD).
 * @param end_date - The end date of the availability window (YYYY-MM-DD).
 * @returns A promise that resolves to an array of hotel objects with availability details.
 */
export async function getHotelsWithAvailability(
    hotelIds: string[],
    start_date: string,
    end_date: string
  ): Promise<Array<{
    id: string;
    name: string;
    logo: string;
    address: string;
    location: string;
    starRating: number;
    images: any;          
    startingPrice: number; 
    // @ts-ignore 
    availableRooms: Room[]; 
  }>> {
    const start = new Date(start_date);
    const end = new Date(end_date);
  
    const hotels = await prisma.hotel.findMany({
      where: {
        id: { in: hotelIds },
      },
      include: {
        rooms: {
          include: {
            bookings: {
              where: {
                status: 'Valid',
                AND: [
                  { checkInDate: { lt: end } },
                  { checkOutDate: { gt: start } },
                ],
              },
            },
          },
        },
      },
    });
  
    const results = hotels
      .map((hotel) => {
        const availableRooms = hotel.rooms.filter((room) => room.bookings.length === 0);
  
        if (availableRooms.length === 0) {
          return null;
        }
  
        const startingPrice = Math.min(...availableRooms.map((r) => r.pricePerNight));
  
        return {
          id: hotel.id,
          name: hotel.name,
          logo: hotel.logo,
          address: hotel.address,
          location: hotel.location,
          starRating: hotel.starRating,
          images: hotel.images,
          startingPrice,
          availableRooms,
        };
      })
      .filter((hotelObj) => hotelObj !== null) as Array<{
        id: string;
        name: string;
        logo: string;
        address: string;
        location: string;
        starRating: number;
        images: any;
        startingPrice: number;
        // @ts-ignore
        availableRooms: Room[];
      }>;
  
    return results;
  }

  export async function addBookingToUser(userId: number, bookingId: number)
  {
        // Get the current user's bookings
        const user = await prisma.user.findUnique({
            // @ts-ignore
            where: { id: userId },
            select: { hotelBookings: true },
        });
        let existingBookings: number[] = [];
// @ts-ignore
        if (user.hotelBookings) {
            try {
                // @ts-ignore
                existingBookings = JSON.parse(user.hotelBookings);
                if (!Array.isArray(existingBookings)) {
                    existingBookings = []; // Reset if it's not an array
                }
            } catch {
                existingBookings = []; // Reset if JSON is invalid
            }
        }
        existingBookings.push(bookingId);

        // Save back to Prisma as JSON
        await prisma.user.update({
            // @ts-ignore
            where: { id: userId },
            data: { hotelBookings: JSON.stringify(existingBookings) },
        });
  }

  export async function getLowestRoomPrice(hotelId: string)
  {
    const hotel = await prisma.hotel.findUnique({
        where: { id: hotelId },
        select: { rooms: true },
    });
    // @ts-ignore
    const lowestPrice = Math.min(...hotel.rooms.map((room) => room.pricePerNight));
    return lowestPrice;
  }

  export async function getHotelAmenities(hotelId: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { rooms: true },
    });
    
    const allAmenities = new Set<string>();
    
    if (hotel && hotel.rooms) {
      hotel.rooms.forEach(room => {
        let roomAmenities: string[] = [];
        
        if (Array.isArray(room.amenities)) {
          roomAmenities = room.amenities.map(item => String(item));
        } else if (typeof room.amenities === "string") {
          roomAmenities = room.amenities.split(",").map(a => a.trim());
        } else if (typeof room.amenities === "object" && room.amenities) {
          roomAmenities = Object.values(room.amenities).map(item => String(item));
        }
        
        roomAmenities.forEach(amenity => allAmenities.add(amenity));
      });
    }
    
    return Array.from(allAmenities);
  }

  export async function getHotelsByUserId(userId: string)
  {
    const hotels = await prisma.hotel.findMany({
        where: { userId: userId },
    });
    return hotels;
  }

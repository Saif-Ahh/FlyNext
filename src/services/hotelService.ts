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


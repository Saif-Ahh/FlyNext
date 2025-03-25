// @ts-nocheck
// controllers/hotelController.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prismaClient';
import { createHotel, createRoom, getBookings, addBooking, getRoomByHotelAndNumber,
         cancelBooking, 
         getRoomAvailability,
         isHotelOwner,
         returnHotelBookings,
         getHotel,
         cancelBookingById,
         findHotelByCity,
         isHotelRoomPriceInRange, 
         isHotelAboveStarRating, doesHotelNameContainKeyword, 
         getHotelsWithAvailability,
         addBookingToUser,
         getRoomObject,
         getBookingByRoomAndDates,
         returnValidHotelBookings, 
         getHotelsByUserId,
         getLowestRoomPrice,
         getHotelAmenities} from '@/services/hotelService';
import {createNotification} from '@/services/notificationService';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
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

export async function ownerViewBookings(req: NextApiRequest, res: NextApiResponse) {
    const { hotelId, dateIn, dateOut, roomType } = req.query;
    const { userId } = req.user as { userId: string };

    if (!hotelId || (!roomType && (!dateIn && !dateOut))) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const isOwner = await isHotelOwner(userId, hotelId);
    if (!isOwner) {
        return res.status(403).json({ error: 'You do not have permission to view bookings for this hotel' });
    }
  
    try {
        const bookings = await getBookings(hotelId, dateIn, dateOut, roomType);
        return res.status(200).json({ bookings });
    } catch (error) {
        console.error('Error retrieving bookings:', error);
        return res.status(500).json({ error: 'Error retrieving bookings' });
    }
}

export async function addHotelBooking(req: NextApiRequest, res: NextApiResponse) {
    try {
        const {hotelId, roomType, roomNum, checkIn, checkOut} = req.body;
        if (!roomType || !hotelId || !roomNum || !checkIn || !checkOut) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const roomId = await getRoomByHotelAndNumber(hotelId, roomNum);
        const room = await getRoomObject(hotelId, roomNum);

        // Return 400 error if room does not exist
        if (!room) {
            return res.status(400).json({ error: 'Room does not exist' });
        }
        // Check if room type is the same as the one provided
        if (room.name !== roomType) {
            return res.status(400).json({ error: 'Room does not exist' });
        }

        const hotelObj = await getHotel(hotelId);
        // Return 400 error if hotel does not exist
        if (!hotelObj) {
            return res.status(400).json({ error: 'Hotel does not exist' });
        }

        const price = room.pricePerNight;
        const userId = (req.user as any).userId;
        const status = "Valid";

        const hotelName = hotelObj.name;
        const timeIn = Date.parse(checkIn);
        const timeOut = Date.parse(checkOut);
        const checkInDate = new Date(timeIn);
        const checkOutDate = new Date(timeOut);

        // Check if there is a booking in the specified room for the given dates
        const existingBooking = await getBookingByRoomAndDates(roomId, checkInDate, checkOutDate);
        if (existingBooking) {
            return res.status(400).json({ error: 'Room is already booked for the specified dates' });
        }

        const newBooking = await addBooking({
            hotelId,
            hotelName,
            roomType,
            roomNum,
            price,
            roomId,
            userId,
            checkInDate,
            checkOutDate,
            status
        });
        const ret = addBookingToUser(userId, newBooking.id);

        const hotel = await prisma.hotel.findUnique({
          where: { id: hotelId },
          select: { userId: true }
        });
        
        await createNotification(userId, 'Your booking has been successfully created.', hotelId);
        
        if (hotel?.userId) {
          await createNotification(hotel.userId, 'A new booking has been made for your hotel.', hotelId);
        }

        return res.status(200).json({ message: 'Booking added successfully', newBooking });
    } catch (error) {
        console.error('Error adding booking:', error);
        return res.status(500).json({ error: 'Error adding booking' });
    }
}

export async function cancelBookingController(req: NextApiRequest, res: NextApiResponse) {
  try {
      const { hotelId, roomNum, bookingID } = req.query;
      const bookingId = parseInt(req.query.bookingID, 10);
      if (isNaN(bookingId)) {
          return res.status(400).json({ error: 'Invalid booking ID' });
      }
      const { userId } = req.user as { userId: string };

      if (!bookingId || !hotelId) {
          return res.status(400).json({ error: 'Booking ID and hotel ID are required' });
      }

      const existingBooking = await getBookingById(bookingId);

      if (!existingBooking) {
          return res.status(404).json({ error: 'Booking not found' });
      }

      if (existingBooking.hotelId !== hotelId) {
          return res.status(400).json({ error: 'Booking does not belong to the specified hotel' });
      }

      const isOwner = await isHotelOwner(userId, hotelId);
      const isBookingOwner = existingBooking.userId === userId;

      if (!isOwner && !isBookingOwner) {
          return res.status(403).json({ error: 'You do not have permission to cancel this booking' });
      }

      if (roomNum) {
          if (existingBooking.roomNum !== roomNum) {
              return res.status(400).json({ error: 'Invalid room number for this booking' });
          }

          const cancelledRoom = await prisma.booking.update({
              where: { id: bookingId },
              data: { status: 'CANCELLED' },
          });

          await createNotification(existingBooking.userId, `Room ${roomNum} in your booking has been cancelled.`, hotelId);

          // Notify hotel owner if user cancelled
          if (isBookingOwner && !isOwner) {
              const hotel = await prisma.hotel.findUnique({
                  where: { id: hotelId },
                  select: { userId: true }
              });
              if (hotel?.userId && hotel.userId !== userId) {
                  await createNotification(hotel.userId, `A user cancelled their booking (Room ${roomNum}) at your hotel.`, hotelId);
              }
          }

          return res.status(200).json({
              message: `Room ${roomNum} in booking cancelled successfully.`,
              booking: cancelledRoom,
          });
      }

      const cancelledBooking = await cancelBookingById(bookingId);

      await createNotification(existingBooking.userId, 'Your booking has been fully cancelled.', hotelId);

      // Notify hotel owner if user cancelled
      if (isBookingOwner && !isOwner) {
          const hotel = await prisma.hotel.findUnique({
              where: { id: hotelId },
              select: { userId: true }
          });
          if (hotel?.userId && hotel.userId !== userId) {
              await createNotification(hotel.userId, `A user cancelled their booking at your hotel.`, hotelId);
          }
      }

      return res.status(200).json({
          message: 'Booking fully cancelled successfully',
          booking: cancelledBooking,
      });
  } catch (error) {
      return res.status(500).json({ error: 'Error cancelling booking' });
  }
}


export async function roomAvailabilityController(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { hotelId, roomType, startDate, endDate } = req.query as {
            hotelId?: string;
            roomType?: string;
            startDate?: string;
            endDate?: string;
        };

        const { userId } = req.user as { userId: string };

        if (!hotelId || !roomType || !startDate || !endDate) {
            return res.status(400).json({ error: 'hotelId, roomType, startDate, and endDate are required' });
        }

        const isOwner = await isHotelOwner(userId, hotelId);
        if (!isOwner) {
            return res.status(403).json({ error: 'You do not have permission to access this hotel\'s data' });
        }

        const availability = await getRoomAvailability(hotelId, roomType, startDate, endDate);

        return res.status(200).json({ availability });
    } catch (error) {
        console.error('Error fetching room availability:', error);
        return res.status(500).json({ error: 'Error fetching room availability' });
    }
}

export async function updateRooms(req: NextApiRequest, res: NextApiResponse)
{
    try {
        // get info from JSON request
        const { hotelId, roomType, newAmount } = req.body;
        if (!hotelId || !roomType || newAmount === undefined || newAmount === null) {
            return res.status(400).json({ error: 'Missing required fields: hotelId, roomType, and newAmount are required' });
        }

        const { userId } = req.user as { userId: string };

        // Check if user is the hotel owner
        const isOwner = await isHotelOwner(userId, hotelId);
        if (!isOwner) {
            return res.status(403).json({ error: 'You do not have permission to update rooms for this hotel' });
        }

        // Get total rooms of this type
        const rooms = await prisma.room.findMany({
            where: {
                hotelId: hotelId,
                name: roomType,
            }
        });

        const totalRoomsOfType = rooms.length;

        // If trying to set more rooms than exist, return an error
        if (newAmount > totalRoomsOfType) {
            return res.status(400).json({ 
                error: `Cannot set ${newAmount} rooms as there are only ${totalRoomsOfType} ${roomType} rooms defined.
                       Please add more room entries of this type first.` 
            });
        }

        // get valid bookings for this hotel and room type
        const bookings = await prisma.booking.findMany({
            where: { 
                hotelId: hotelId,
                roomType: roomType,
                status: "Valid"
            },
            include: {
                hotel: true,
                room: true
            }
        });

        // If there are fewer bookings than the new amount, no cancellations needed
        if (bookings.length <= newAmount) {
            return res.status(200).json({ 
                message: 'No cancellations required. Room quantity updated successfully.',
                currentBookings: bookings.length,
                newCapacity: newAmount
            });
        }

        // need to cancel some bookings
        const bookingsToCancel = bookings.length - newAmount;
        
        // Sort bookings by creation date (newest first) so we cancel the most recent bookings
        const sortedBookings = [...bookings].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Select the newest bookings to cancel (up to the required number)
        const bookingsToProcess = sortedBookings.slice(0, bookingsToCancel);
        
        // Cancel each booking
        const canceledReservations = [];
        for (const booking of bookingsToProcess) {
            try {
                // Update booking status to CANCELLED
                const canceledBooking = await prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: 'CANCELLED' }
                });

                // Create notification for the user who made the booking
                await prisma.notification.create({
                    data: {
                        userId: booking.userId,
                        hotelId: booking.hotelId,
                        message: `Your booking at ${booking.hotelName} for ${booking.roomType} room has been cancelled due to inventory update.`,
                        isRead: false
                    }
                });

                // Add to canceled list with user information
                const user = await prisma.user.findUnique({
                    where: { id: booking.userId },
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                });

                canceledReservations.push({
                    id: canceledBooking.id,
                    hotelName: canceledBooking.hotelName,
                    roomType: canceledBooking.roomType,
                    roomNum: canceledBooking.roomNum,
                    checkInDate: canceledBooking.checkInDate,
                    checkOutDate: canceledBooking.checkOutDate,
                    userId: canceledBooking.userId,
                    firstName: user?.firstName || 'Unknown',
                    lastName: user?.lastName || 'Guest',
                    email: user?.email || 'No email'
                });
            } catch (error) {
                console.error(`Error cancelling booking ${booking.id}:`, error);
                // Continue with other bookings even if one fails
            }
        }

        // Return the success message with canceled reservations
        return res.status(200).json({
            message: `Room quantity updated. ${canceledReservations.length} reservation(s) were canceled.`,
            canceledReservations,
            previousCapacity: totalRoomsOfType,
            newCapacity: newAmount,
            remainingBookings: bookings.length - canceledReservations.length
        });
    } catch (error) {
        console.error('Error updating room availability:', error);
        return res.status(500).json({ error: 'Error updating room availability' });
    }
}

export async function viewDetailedHotel(req: NextApiRequest, res: NextApiResponse)
{
    const {hotelId} = req.query;
    if (!hotelId) {
        return res.status(400).json({ error: 'hotelId is required' });
    }

    try {
        const hotel = await getHotel(hotelId);
        if (!hotel) {
            return res.status(404).json({ error: "Hotel not found" });
        }

        // create a dict with the key being the hotel type and value being lowest offered price
        const roomTypeData: { [key: string]: { startingPrice: number, possibleAmenities: Set<string> } } = {};
        hotel.rooms.forEach((room) => {
            let roomAmenities: string[] = [];
        
            if (Array.isArray(room.amenities)) {
                roomAmenities = room.amenities.map(String);
            } else if (typeof room.amenities === "string") {
                roomAmenities = room.amenities.split(",").map((a) => a.trim());
            } else if (typeof room.amenities === "object") {
                roomAmenities = Object.values(room.amenities).map(String);
            }
        
            if (!roomTypeData[room.name]) {
                roomTypeData[room.name] = { startingPrice: room.pricePerNight, possibleAmenities: new Set() };
            }
        
            if (room.pricePerNight < roomTypeData[room.name].startingPrice) {
                roomTypeData[room.name].startingPrice = room.pricePerNight;
            }
        
            roomAmenities.forEach((amenity) => roomTypeData[room.name].possibleAmenities.add(amenity));
        });
        
        // Convert possibleAmenities Set to an array for the final response
        Object.keys(roomTypeData).forEach((roomType) => {
            roomTypeData[roomType].possibleAmenities = Array.from(roomTypeData[roomType].possibleAmenities);
        });
        
        return res.status(200).json({ message: "Hotel found!", roomTypeData });
    } catch (error) {
        console.error('Error fetching hotel details:', error);
        return res.status(500).json({ error: 'Error fetching hotel details' });
    }
}

export async function viewRoomInformation(req: NextApiRequest, res: NextApiResponse)
{
    const {hotelId} = req.query;
    if (!hotelId) {
        return res.status(400).json({ error: 'hotelId is required' });
    }

    try {
        const hotel = await getHotel(hotelId);
        if (!hotel) {
            return res.status(404).json({ error: "Hotel not found" });
        }
        
        const bookings = await returnHotelBookings(hotelId);
        const roomInformation: { [key: string]: { roomNumber: number, price: number, amenities: string[], isAvailable: boolean }[] } = {};

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize today's date

        // Precompute room availability based on bookings
        const roomAvailability: { [roomNum: number]: boolean } = {};

        for (const booking of bookings) {
            if (booking.status === "Valid") {
                const checkIn = new Date(booking.checkInDate);
                checkIn.setHours(0, 0, 0, 0);

                const checkOut = new Date(booking.checkOutDate);
                checkOut.setHours(0, 0, 0, 0);

                // If a booking starts today or is ongoing, mark room as unavailable
                if (checkIn.getTime() === today.getTime() || (checkIn.getTime() < today.getTime() && checkOut.getTime() > today.getTime())) {
                    roomAvailability[booking.roomNum] = false;
                }
            }
        }

        for (const room of hotel.rooms) 
        {
            let roomAmenities: string[] = [];
            if (Array.isArray(room.amenities)) {
                roomAmenities = room.amenities.map(String);
            } else if (typeof room.amenities === "string") {
                roomAmenities = room.amenities.split(",").map((a) => a.trim());
            } else if (typeof room.amenities === "object") {
                roomAmenities = Object.values(room.amenities).map(String);
            }

            if (!roomInformation[room.name]) {
                roomInformation[room.name] = [];
            }
            const isAvailable = roomAvailability[room.roomNum] !== false;

            roomInformation[room.name].push({
                roomNumber: room.roomNum,
                price: room.pricePerNight,
                amenities: roomAmenities,
                isAvailable: isAvailable,
            });
        }



        return res.status(200).json({
            message: "Room information retrieved",
            roomInformation
        });

    } catch (error) {
        console.error('Error fetching hotel room details:', error);
        return res.status(500).json({ error: 'Error fetching hotel room details' });
    }
}

export async function getHotelSuggestions(req: NextApiRequest, res: NextApiResponse)
{
    const {location} = req.query;
    if (!location) {
        return res.status(400).json({ error: 'Location is required' });
    }

    try
    {
        const hotels = await findHotelByCity(location);
        return res.status(200).json({
            message: "Hotels found:",
            hotels
        });
    } catch (error) {
        console.error('Error fetching hotel suggestions:', error);
        return res.status(500).json({ error: 'Error fetching hotel suggestions' });
    }

}


/**
 * Filters hotels based on:
 * 1) City
 * 2) Minimum Star Rating
 * 3) Room Price Range (for a given date range)
 * 4) Keyword in Hotel Name (if provided)
 *
 * @param startDate - The start date of the availability window (YYYY-MM-DD).
 * @param endDate - The end date of the availability window (YYYY-MM-DD).
 * @param city - City name to filter hotels by.
 * @param keyword - Keyword to search for in hotel names (ignored if empty).
 * @param starRating - Minimum star rating required.
 * @param minPrice - Minimum price threshold for available rooms.
 * @param maxPrice - Maximum price threshold for available rooms.
 * @returns A promise that resolves to a list of hotel IDs matching all criteria.
 * aided by chatgpt
 */
export async function searchHotels(
    startDate: string,
    endDate: string,
    city: string,
    keyword: string,
    starRating: number,
    minPrice: number,
    maxPrice: number
  ): Promise<string[]> {
    const hotelsInCity = await findHotelByCity(city);
  
    let hotelIds = hotelsInCity.map((hotel) => hotel.id);
  
    // 2) Filter by minimum star rating
    const filteredByStar: string[] = [];
    for (const id of hotelIds) {
      const aboveStar = await isHotelAboveStarRating(id, starRating);
      if (aboveStar) {
        filteredByStar.push(id);
      }
    }
    hotelIds = filteredByStar;

    const filteredByPrice: string[] = [];
    for (const id of hotelIds) {
      const inRange = await isHotelRoomPriceInRange(id, minPrice, maxPrice, startDate, endDate);
      if (inRange) {
        filteredByPrice.push(id);
      }
    }
    hotelIds = filteredByPrice;
  
    if (keyword.trim() !== '') {
      const filteredByKeyword: string[] = [];
      for (const id of hotelIds) {
        const containsKeyword = await doesHotelNameContainKeyword(id, keyword);
        if (containsKeyword) {
          filteredByKeyword.push(id);
        }
      }
      hotelIds = filteredByKeyword;
    }
  
    return hotelIds;
  }


export async function getHotelAvailability(
    hotelIds: string[],
    start_date: string,
    end_date: string
  ):
    Promise<{ [hotelId: string]: boolean }> {

    return getHotelsWithAvailability(hotelIds, start_date, end_date);
    
  }


export async function getBookingById(bookingId: number) {
    try {
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            return null;
        }
        return booking;
    } catch (error) {
        console.error("Error fetching booking:", error);
        return null;
    }
}

/**
 * Retrieves all hotel bookings for a specific user
 * @param userId The ID of the user whose bookings to retrieve
 * @returns Object containing the user's hotel bookings
 */
export async function getUserHotelBookings(userId: string) {
  try {
    const bookings = await prisma.booking.findMany({
      where: {
        userId: userId
      },
      include: {
        hotel: true,
        room: true
      }
    });
    
    // Format the data to match the BookingsResponse interface
    const formattedBookings = bookings.map(booking => ({
      id: booking.id,
      hotelId: booking.hotelId,
      hotelName: booking.hotel.name,
      roomType: booking.room.name,
      roomNum: booking.roomNum,
      price: booking.room.pricePerNight,
      checkInDate: booking.checkInDate.toISOString(),
      checkOutDate: booking.checkOutDate.toISOString(),
      status: booking.status,
      createdAt: booking.createdAt.toISOString(),
      hotelDetails: {
        id: booking.hotel.id,
        name: booking.hotel.name,
        location: booking.hotel.location,
        address: booking.hotel.address,
        starRating: booking.hotel.starRating
      },
      roomDetails: {
        id: booking.room.id,
        name: booking.room.name,
        roomNum: booking.roomNum,
        amenities: Array.isArray(booking.room.amenities) 
          ? booking.room.amenities 
          : typeof booking.room.amenities === 'string'
            ? booking.room.amenities.split(',').map(a => a.trim())
            : [],
        pricePerNight: booking.room.pricePerNight
      }
    }));

    return { bookings: formattedBookings };
  } catch (error) {
    console.error('Error retrieving user hotel bookings:', error);
    throw new Error('Failed to retrieve bookings');
  }
}

/**
 * Cancels a hotel booking for a user
 * @param userId The ID of the user who owns the booking
 * @param bookingId The ID of the booking to cancel
 * @returns A success message or error message
 */
export async function cancelHotelBooking(userId: string, bookingId: number) {
  try {
    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: {
        id: bookingId
      },
      include: {
        hotel: true
      }
    });

    if (!booking) {
      return { error: 'Booking not found' };
    }

    // User can cancel if they're the booking owner OR the hotel owner
    const isBookingOwner = booking.userId === userId;
    
    // Get the hotel to check if this user is the owner
    const isHotelOwner = booking.hotel && booking.hotel.userId === userId;
    
    if (!isBookingOwner && !isHotelOwner) {
      return { error: 'You do not have permission to cancel this booking' };
    }

    // Update booking status to 'CANCELLED'
    const updatedBooking = await prisma.booking.update({
      where: {
        id: bookingId
      },
      data: {
        status: 'CANCELLED'
      }
    });

    // Create notification for the user who made the booking
    try {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          hotelId: booking.hotelId,
          message: `Your booking at ${updatedBooking.hotelName} has been cancelled.`,
          isRead: false
        }
      });
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Continue execution even if notification creation fails
    }

    return { message: 'Booking cancelled successfully', booking: updatedBooking };
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return { error: 'Failed to cancel booking' };
  }
}

export async function generateHotelInvoice(bookingId: number): Promise<Buffer> {
    try {
      // Get the booking directly from the database using Prisma
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId }
      });
  
      if (!booking) {
        throw new Error('Hotel booking not found');
      }
  
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 400]);
  
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
      const {
        hotelName,
        roomType,
        roomNum,
        price,
        checkInDate,
        checkOutDate,
        status,
        createdAt,
      } = booking;
      
      // Ensure dates are properly parsed with no time component for accurate day calculation
      const startDate = new Date(checkInDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(checkOutDate);
      endDate.setHours(0, 0, 0, 0);
      
      // Calculate the exact number of days between dates
      const timeDiffMs = endDate.getTime() - startDate.getTime();
      const nights = Math.max(1, Math.round(timeDiffMs / (1000 * 60 * 60 * 24)));
      
      // Parse the price to ensure it's a number
      const pricePerNight = parseFloat(String(price));
      
      // Calculate the total price
      const totalAmount = pricePerNight * nights;
      
      // Format with exactly 2 decimal places
      const formattedPricePerNight = pricePerNight.toFixed(2);
      const formattedTotalPrice = totalAmount.toFixed(2);
  
      // Draw the invoice title
      page.drawText('Hotel Booking Invoice', {
        x: 50,
        y: 350,
        size: 24,
        font,
        color: rgb(0, 0, 0),
      });
  
      // Draw booking details
      page.drawText(`Hotel Name: ${hotelName}`, {
        x: 50,
        y: 320,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
  
      page.drawText(`Room Type: ${roomType}`, {
        x: 50,
        y: 300,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
  
      page.drawText(`Room Number: ${roomNum}`, {
        x: 50,
        y: 280,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
  
      page.drawText(`Check-In Date: ${new Date(checkInDate).toLocaleString()}`, {
        x: 50,
        y: 260,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
  
      page.drawText(`Check-Out Date: ${new Date(checkOutDate).toLocaleString()}`, {
        x: 50,
        y: 240,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
  
      page.drawText(`Status: ${status}`, {
        x: 50,
        y: 220,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
  
      page.drawText(`Booking Date: ${new Date(createdAt).toLocaleString()}`, {
        x: 50,
        y: 200,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Add price per night
      page.drawText(`Price per night: ${formattedPricePerNight} USD`, {
        x: 50,
        y: 170,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Add number of nights
      page.drawText(`Number of nights: ${nights}`, {
        x: 50,
        y: 150,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
  
      // Show the total price with updated calculation
      page.drawText(`Total Price: ${formattedTotalPrice} USD`, {
        x: 50,
        y: 120, 
        size: 14, 
        font: boldFont, 
        color: rgb(0, 0, 0),
      });
  
      // Save the PDF and return it as a Buffer
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error: any) {
      console.error('Error generating hotel invoice:', error.message);
      throw new Error(`Failed to generate hotel invoice: ${error.message}`);
    }
  }
  
  // get all hotels for a user
  export async function getUserHotels(req: NextApiRequest, res: NextApiResponse) {
    const { userId } = req.user as { userId: string };
    const hotels = await getHotelsByUserId(userId);

    if (!hotels) {
        return res.status(404).json({ error: 'No hotels found' });
    }
    return res.status(200).json({ hotels });
  }

  export async function getLowestPriceAllAmenities(req: NextApiRequest, res: NextApiResponse) {
    const { hotelId } = req.query;
    if (!hotelId) {
        return res.status(400).json({ error: 'hotelId is required' });
    }
    // Get lowest price and all amenities for a hotel
    const lowestPrice = await getLowestRoomPrice(hotelId);
    const allAmenities = await getHotelAmenities(hotelId);
    return res.status(200).json({ lowestPrice, allAmenities });
  }

  export async function getAllAmenitiesByLocation(req: NextApiRequest, res: NextApiResponse) {
    const { location } = req.query;
    if (!location) {
        return res.status(400).json({ error: 'Location is required' });
    }
    const hotels = await findHotelByCity(location);
    const allAmenities = [];
    for (const hotel of hotels) {
        const amenities = await getHotelAmenities(hotel.id);
        allAmenities.push(...amenities);
    }
    // Remove duplicates
    const uniqueAmenities = [...new Set(allAmenities)];
    return res.status(200).json({ allAmenities: uniqueAmenities });
  }

  /**
   * Retrieves all bookings for hotels owned by a specific user
   * @param userId The ID of the hotel owner
   * @returns Object containing bookings for all hotels owned by the user
   */
  export async function getOwnerHotelBookings(userId: string) {
    try {
      // First, get all hotels owned by the user
      const userHotels = await prisma.hotel.findMany({
        where: {
          userId: userId
        }
      });

      if (!userHotels || userHotels.length === 0) {
        return { bookings: [] };
      }

      // Get the hotel IDs
      const hotelIds = userHotels.map(hotel => hotel.id);

      // Get all bookings for these hotels
      const bookings = await prisma.booking.findMany({
        where: {
          hotelId: {
            in: hotelIds
          }
        },
        include: {
          hotel: true,
          room: true
        }
      });
      
      // Fetch user data separately for each booking
      const formattedBookings = await Promise.all(bookings.map(async booking => {
        // Get user information for each booking
        const user = await prisma.user.findUnique({
          where: { id: booking.userId },
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        });
        
        return {
          id: booking.id,
          hotelId: booking.hotelId,
          hotelName: booking.hotel.name,
          roomType: booking.room.name,
          roomNum: booking.roomNum,
          price: booking.room.pricePerNight,
          checkInDate: booking.checkInDate.toISOString(),
          checkOutDate: booking.checkOutDate.toISOString(),
          status: booking.status,
          createdAt: booking.createdAt.toISOString(),
          userId: booking.userId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          hotelDetails: {
            id: booking.hotel.id,
            name: booking.hotel.name,
            location: booking.hotel.location,
            address: booking.hotel.address,
            starRating: booking.hotel.starRating
          },
          roomDetails: {
            id: booking.room.id,
            name: booking.room.name,
            roomNum: booking.roomNum,
            amenities: Array.isArray(booking.room.amenities) 
              ? booking.room.amenities 
              : typeof booking.room.amenities === 'string'
                ? booking.room.amenities.split(',').map(a => a.trim())
                : [],
            pricePerNight: booking.room.pricePerNight
          }
        };
      }));

      return { bookings: formattedBookings };
    } catch (error) {
      console.error('Error retrieving hotel owner bookings:', error);
      throw new Error('Failed to retrieve bookings for hotel owner');
    }
  }

/**
 * Retrieve a specific room by hotel ID and room number
 */
export async function getRoomObject(hotelId: string, roomNum: string) {
  try {
    const room = await prisma.room.findFirst({
      where: {
        hotelId: hotelId,
        roomNum: roomNum
      }
    });
    return room;
  } catch (error) {
    console.error('Error fetching room:', error);
    return null;
  }
}

export async function getRoomAmt(hotelId: string, roomType: string) {
  // Get amount of valid bookings for roomType in hotel
  const roomAmount = await prisma.booking.count({
    where: {
      hotelId: hotelId,
      roomType: roomType,
      status: 'Valid'
    }
  });
  return roomAmount;
}


// @ts-nocheck
// controllers/hotelController.ts
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/prismaClient';
import { createHotel, createRoom, getBookings, getRoomAvailability, isHotelOwner, cancelBookingById, getRoomObject } from '@/services/hotelService';
import {createNotification} from '@/services/notificationService';
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


// controllers/bookingController.ts
import dotenv from 'dotenv';
import { getUserById, updateUser } from '../services/userService'; 
import { createBooking, retrieveBooking, cancelbooking, listAirports } from '../services/flightService'; 
import { createNotification } from '@/services/notificationService';

dotenv.config();

const apiKey = process.env.AFS_API_KEY as string;

interface BookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  flightIds: string[];
}

interface FlightDetails {
  airline: {
    name: string;
  };
  flightNumber: string;
  origin: {
    city: string;
    code: string;
  };
  destination: {
    city: string;
    code: string;
  };
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
}

interface BookingDetails {
  bookingReference: string;
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  flights: FlightDetails[];
}

/**
 * Creates a flight booking for a user.
 */
export async function bookFlights(userId: string, flightIds: string[]) {
  try {
    const user = await getUserById(userId);

    if (!user) {
      return { error: 'User not found.' };
    }

    const bookingRequest: BookingRequest = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      passportNumber: user.passportNumber,
      flightIds: flightIds,
    };

    console.log('Booking Request:', bookingRequest);

    const bookingResult = await createBooking(apiKey, bookingRequest);

    if ('error' in bookingResult) {
      return bookingResult;
    }

    const bookingReference = bookingResult.bookingReference;
    const updatedBookingReferences = Array.isArray(user.bookingReferences)
      ? [...user.bookingReferences, bookingReference]
      : [bookingReference];

    await updateUser(userId, { bookingReferences: updatedBookingReferences });

    await createNotification(userId, `Your flight booking (Ref: ${bookingReference}) was successful.`);

    return bookingResult;
  } catch (error: any) {
    return { error: `Error booking flights: ${error.message}` };
  }
}

/**
 * Retrieves all booked flights for a user by their ID.
 */
export async function retrieveBookedFlights(userId: string): Promise<{ bookings: Array<BookingDetails | { error: string }> }> {
  try {
    const user = await getUserById(userId);

    if (!user) {
      throw new Error('User not found.');
    }

    const bookingReferences = Array.isArray(user.bookingReferences)
    ? (user.bookingReferences as string[])
    : [];

    const bookings: Array<BookingDetails | { error: string }> = [];

    for (const reference of bookingReferences) {
      try {
        const booking = await retrieveBooking(process.env.AFS_API_KEY as string, user.lastName, reference);
        bookings.push(booking);
      } catch (error: any) {
        bookings.push({ error: `Failed to retrieve booking ${reference}: ${error.message}` });
      }
    }

    return { bookings };
  } catch (error: any) {
    console.error('Error retrieving booked flights:', error.message);
    return { bookings: [{ error: `Failed to retrieve booked flights: ${error.message}` }] };
  }
}

/**
 * Retrieves a single booking by its reference for a specific user.
 */
export async function getBookingByReference(userId: string, bookingReference: string): Promise<BookingDetails | { error: string }> {
  try {
    const user = await getUserById(userId);

    if (!user) {
      throw new Error('User not found.');
    }

    if (!user.lastName) {
      return { error: 'User last name is missing.' };
    }

    const booking = await retrieveBooking(process.env.AFS_API_KEY as string, user.lastName, bookingReference);

    if ('error' in booking) {
      return booking;
    }

    return booking;
  } catch (error: any) {
    console.error('Error retrieving booking:', error.message);
    return { error: `Failed to retrieve booking: ${error.message}` };
  }
}

/**
 * Cancels a flight booking for a user.
 */
export async function cancelflightcontroller(lastname: string, bookingref: string, userId: string) {
  try {
    const response = await cancelbooking(lastname, bookingref, apiKey);

    if ('error' in response) {
      return response;
    }

    // ✅ Notify user about cancellation
    await createNotification(userId, `Your flight booking (Ref: ${bookingref}) has been cancelled.`);

    return response;
  } catch (error: any) {
    console.error('Error cancelling booking:', error.message);
    return { error: `Failed to cancel booking: ${error.message}` };
  }
}

/**
 * Wrapper function for listAirports that provides the required API key.
 * 
 * @returns {Promise<object|{error: string}>} A promise that resolves to one of:
 *   - An array of airport objects: [{ id, code, name, city, country }, ...]
 *   - An error object: { error: string }
 */
export async function listAirportsWrapper() {
  try {
    return await listAirports(apiKey);
  } catch (error: any) {
    console.error('Error in listAirportsWrapper:', error.message);
    return { error: `Failed to fetch airports: ${error.message}` };
  }
}




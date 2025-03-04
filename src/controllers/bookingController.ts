// controllers/bookingController.ts
import dotenv from 'dotenv';
import { getUserById, updateUser } from '../services/userService'; 
import { createBooking, listAirports } from '../services/flightService';
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




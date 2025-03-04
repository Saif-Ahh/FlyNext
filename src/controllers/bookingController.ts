// controllers/bookingController.ts
import dotenv from 'dotenv';
import { listAirports } from '../services/flightService';

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




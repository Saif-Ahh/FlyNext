// controllers/bookingController.ts
import dotenv from 'dotenv';
import { listAirports } from '../services/flightService';

dotenv.config();

const apiKey = process.env.AFS_API_KEY as string;

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




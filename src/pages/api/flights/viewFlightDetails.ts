import { NextApiRequest, NextApiResponse } from 'next';
import { findTripByFlightNumbers, getFlightDetails } from '@/controllers/flightController'; 


/**
 * API endpoint to fetch flight details based on origin, destination, date, and flight numbers.
 *
 * @param req - Next.js API request object.
 * @param res - Next.js API response object.
 * aided by chatgpt
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { origin, destination, date, flightNumbers } = req.query;

  // Validate required fields
  if (!origin || !destination || !date || !flightNumbers) {
    return res.status(400).json({ error: 'Missing required query parameters: origin, destination, date, flightNumbers' });
  }

  // Convert flightNumbers from a string to an array
  // @ts-ignore
  const flightNumbersArray = flightNumbers.split(',');

  try {
    // Fetch the itinerary using findTripByFlightNumbers
    const itinerary = await findTripByFlightNumbers(date as string, origin as string, destination as string, flightNumbersArray);

    // Process the itinerary using getFlightDetails
    const flightDetails = getFlightDetails(itinerary);

    // Return the flight details
    res.status(200).json(flightDetails);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
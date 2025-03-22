import { NextApiRequest, NextApiResponse } from 'next';

// Assume these two functions are defined in the controller file
// (or imported from a local module that is part of the controller)
// @ts-ignore
import { searchHotels, getHotelAvailability } from '@/controllers/hotelController';

/**
 * GET /api/final-available-hotels?startDate=...&endDate=...&city=...&keyword=...&starRating=...&minPrice=...&maxPrice=...
 *
 * This function filters hotels based on:
 * 1) City, star rating, price range (for the given date range) and keyword (if provided)
 * 2) Then retrieves detailed availability info for those hotels.
 *
 * The final output is returned as JSON.
 */
export default async function getFinalAvailableHotelsController(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
}

  try {
    const { startDate, endDate, city, keyword, starRating, minPrice, maxPrice } = req.query;

    if (!startDate || !endDate || !city || !starRating || !minPrice || !maxPrice) {
      return res.status(400).json({ error: 'Missing required query parameters.' });
    }

    const parsedStarRating = parseFloat(starRating.toString());
    const parsedMinPrice = parseFloat(minPrice.toString());
    const parsedMaxPrice = parseFloat(maxPrice.toString());

    const hotelIds = await searchHotels(
      startDate.toString(),
      endDate.toString(),
      city.toString(),
      keyword ? keyword.toString() : '',
      parsedStarRating,
      parsedMinPrice,
      parsedMaxPrice
    );

    const finalOutput = await getHotelAvailability(hotelIds, startDate.toString(), endDate.toString());

    return res.status(200).json({ hotels: finalOutput });
  } catch (error: any) {
    console.error('Error fetching final available hotels:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

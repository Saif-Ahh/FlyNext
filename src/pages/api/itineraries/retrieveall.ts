// @ts-nocheck 
import { NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/middleware/authMiddleware';
import { AuthenticatedRequest } from '@/middleware/authMiddleware';
// @ts-ignore
import { getBookingById } from '@/controllers/hotelController';
// @ts-ignore
import { retrieveBooking } from '@/services/flightService';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User information missing.' });
  }

  try {
    const rawItineraries = await prisma.itinerary.findMany({
      where: { userId: req.user.userId },
    });

    const enrichedItineraries = await Promise.all(
      rawItineraries.map(async (itinerary) => {
        let hotelBooking = null;
        let flightBooking = null;

        if (itinerary.hotelBookingRef) {
          hotelBooking = await getBookingById(parseInt(itinerary.hotelBookingRef));
        }

        if (itinerary.flightBookingRef) {
          const flightResult = await retrieveBooking(
            process.env.AFS_API_KEY!,
            req.user.lastName,
            itinerary.flightBookingRef
          );

          flightBooking = {
            ...flightResult,
            id: itinerary.flightBookingRef
          };
        }

        return {
          ...itinerary,
          hotelBooking,
          flightBooking,
        };
      })
    );

    return res.status(200).json({ itineraries: enrichedItineraries });
  } catch (error: any) {
    console.error('Error retrieving itineraries:', error.message);
    return res.status(500).json({ error: `Failed to retrieve itineraries: ${error.message}` });
  }
}

export default authMiddleware(handler);

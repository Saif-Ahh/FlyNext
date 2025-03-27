import { NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/authMiddleware';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!req.user?.userId) {
    console.error('[AUTH ERROR] Missing user ID in request.');
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  const userId: string = req.user.userId;
  const { hotelBookingRef, flightBookingRef } = req.body;

  console.log('[CREATE ITINERARY] POST /api/itineraries/create');
  console.log('User ID:', userId);
  console.log('Hotel Ref:', hotelBookingRef);
  console.log('Flight Ref:', flightBookingRef);

  if (!hotelBookingRef && !flightBookingRef) {
    console.error('[VALIDATION ERROR] Both hotel and flight references are missing.');
    return res.status(400).json({
      error: 'At least one of hotelBookingRef or flightBookingRef is required.',
    });
  }

  try {
    const itinerary = await prisma.itinerary.create({
      data: {
        userId,
        hotelBookingRef: hotelBookingRef ?? null,
        flightBookingRef: flightBookingRef ?? null,
      },
    });

    console.log('[SUCCESS] Itinerary created:', itinerary);
    return res.status(201).json({ message: 'Itinerary created successfully.', itinerary });
  } catch (error: any) {
    console.error('[SERVER ERROR] Failed to create itinerary:', error);
    return res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
}

export default authMiddleware(handler);

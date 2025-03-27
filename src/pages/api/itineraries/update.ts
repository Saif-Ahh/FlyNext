// /api/itineraries/update.ts
import { NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '@/middleware/authMiddleware';
import { AuthenticatedRequest } from '@/middleware/authMiddleware';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User information missing.' });
  }

  const { itineraryId, flightBookingRef, hotelBookingRef } = req.query;

  if (!itineraryId || typeof itineraryId !== 'string') {
    return res.status(400).json({ error: 'Itinerary ID is required and must be a string.' });
  }

  if (flightBookingRef !== undefined && typeof flightBookingRef !== 'string') {
    return res.status(400).json({ error: 'flightBookingRef must be a string.' });
  }

  if (hotelBookingRef !== undefined && typeof hotelBookingRef !== 'string') {
    return res.status(400).json({ error: 'hotelBookingRef must be a string.' });
  }

  try {
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
    });

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found.' });
    }

    if (itinerary.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden. You are not the owner of this itinerary.' });
    }

    console.log('[DEBUG] Current itinerary state:', itinerary);
    console.log('[DEBUG] Incoming params:', { itineraryId, flightBookingRef, hotelBookingRef });

    const willHaveNoFlight = flightBookingRef === 'delete' || itinerary.flightBookingRef === null;
    const willHaveNoHotel = hotelBookingRef === 'delete' || itinerary.hotelBookingRef === null;

    if (willHaveNoFlight && willHaveNoHotel) {
      await prisma.itinerary.delete({ where: { id: itineraryId } });
      return res.status(200).json({ message: 'Itinerary deleted because both bookings were removed.' });
    }

    const updateData: { flightBookingRef?: string | null; hotelBookingRef?: string | null } = {};

    if (flightBookingRef !== undefined) {
      updateData.flightBookingRef = flightBookingRef === 'delete' ? null : flightBookingRef;
    }

    if (hotelBookingRef !== undefined) {
      updateData.hotelBookingRef = hotelBookingRef === 'delete' ? null : hotelBookingRef;
    }

    const updated = await prisma.itinerary.update({
      where: { id: itineraryId },
      data: updateData,
    });

    console.log('[DEBUG] Updated itinerary:', updated);
    return res.status(200).json({ message: 'Itinerary updated successfully', itinerary: updated });
  } catch (error: any) {
    console.error('❌ Error in update.ts:', error.message);
    return res.status(500).json({ error: `Failed to update itinerary: ${error.message}` });
  }
}

export default authMiddleware(handler);

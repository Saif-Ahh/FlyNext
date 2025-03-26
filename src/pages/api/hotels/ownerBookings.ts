import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { getOwnerHotelBookings } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  // Use type assertion to access the method property
  const method = (req as any).method;
  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User information missing.' });
  }

  const { userId } = req.user;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. User ID missing in payload.' });
  }

  try {
    const bookingsResult = await getOwnerHotelBookings(userId);

    if (!bookingsResult || bookingsResult.bookings.length === 0) {
      return res.status(200).json({ bookings: [] });
    }

    res.status(200).json(bookingsResult);
  } catch (error: any) {
    console.error('Error retrieving owner bookings:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export default authMiddleware(handler); 
import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { cancelHotelBooking } from '@/controllers/hotelController';
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
  const { bookingId } = req.query;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. User ID missing in payload.' });
  }

  if (!bookingId || typeof bookingId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required field: bookingId' });
  }

  try {
    const bookingResult = await cancelHotelBooking(userId, parseInt(bookingId));

    if ('error' in bookingResult) {
      return res.status(400).json({ error: bookingResult.error });
    }

    res.status(200).json(bookingResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export default authMiddleware(handler); 
import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { getBookingByReference } from '@/controllers/bookingController'; 
import { authMiddleware } from '@/middleware/authMiddleware';
//aided by chatgpt
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  console.log('Request User:', req.user);

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User information missing.' });
  }

  const { userId } = req.user;
  console.log('User ID:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. User ID missing in payload.' });
  }

  const { bookingReference } = req.query;

  if (!bookingReference || typeof bookingReference !== 'string') {
    return res.status(400).json({ error: 'Booking reference is required and must be a string.' });
  }

  try {
    const bookingResult = await getBookingByReference(userId, bookingReference);

    if ('error' in bookingResult) {
      return res.status(400).json({ error: bookingResult.error });
    }

    res.status(200).json(bookingResult);
  } catch (error: any) {
    console.error('Error retrieving booking:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export default authMiddleware(handler);
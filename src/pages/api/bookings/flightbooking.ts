import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { bookFlights } from '@/controllers/bookingController';
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
  // print userId to console
  console.log('User ID:', userId);



  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. User ID missing in payload.' });
  }

  const { flightIds } = req.query;

  if (!flightIds || typeof flightIds !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required field: flightIds' });
  }

  const flightIdsArray = flightIds.split(',');

  try {
    const bookingResult = await bookFlights(userId, flightIdsArray);

    console.log('Booking Result:', bookingResult);

    if ('error' in bookingResult) {
      return res.status(400).json({ error: bookingResult.error });
    }

    res.status(200).json(bookingResult);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export default authMiddleware(handler);

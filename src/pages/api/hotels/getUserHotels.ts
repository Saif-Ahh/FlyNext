import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { getUserHotels } from '@/controllers/hotelController';
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
    return await getUserHotels(req, res);
  } catch (error: any) {
    console.error('Error retrieving user hotels:', error.message);
    res.status(500).json({ error: error.message });
  }
}

export default authMiddleware(handler); 
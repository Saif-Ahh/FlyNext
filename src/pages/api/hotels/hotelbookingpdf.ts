import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { generateHotelInvoice } from '@/controllers/hotelController';
import { authMiddleware } from '@/middleware/authMiddleware';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
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
    const bookingIdNumber = parseInt(bookingId, 10);
    if (isNaN(bookingIdNumber)) {
      return res.status(400).json({ error: 'Invalid booking ID format' });
    }

    const pdfBuffer = await generateHotelInvoice(bookingIdNumber);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=hotel-invoice-${bookingId}.pdf`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating invoice:', error.message);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
}

export default authMiddleware(handler);
import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { authMiddleware } from '@/middleware/authMiddleware';
import { generateInvoice } from '@/controllers/bookingController';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User information missing.' });
  }

  const { bookingReference } = req.query;

  // get user last name
    const lastName = req.user.lastName;

  if (!bookingReference || typeof bookingReference !== 'string') {
    return res.status(400).json({ error: 'Booking reference is required and must be a string.' });
  }

  try {
    const pdfBuffer = await generateInvoice(bookingReference, lastName);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${bookingReference}.pdf"`);

    res.status(200).send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating invoice:', error.message);
    res.status(500).json({ error: `Failed to generate invoice: ${error.message}` });
  }
}

export default authMiddleware(handler);
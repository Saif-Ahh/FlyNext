import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { authMiddleware } from '@/middleware/authMiddleware';

/**
 * Validates a credit card's number, PIN, and expiration date.
 *
 * @param {string | number} cardNumber - The credit card number (must be 16 digits long).
 * @param {string | number} pin - The credit card PIN (must be 3 digits long).
 * @param {Date | string} expirationDate - The expiration date (must be in the future).
 * @returns {boolean} - Returns `true` if all inputs are valid, otherwise `false`.
 * aided by chatgpt
 */
function validateCreditCard(
  cardNumber: string | number,
  pin: string | number,
  expirationDate: Date | string
): boolean {
  const cardNumberStr = cardNumber.toString();
  const pinStr = pin.toString();

  const isCardNumberValid = /^\d{16}$/.test(cardNumberStr);
  if (!isCardNumberValid) {
    console.error('Invalid credit card number. It must be exactly 16 digits long.');
    return false;
  }

  const isPinValid = /^\d{3}$/.test(pinStr);
  if (!isPinValid) {
    console.error('Invalid PIN. It must be exactly 3 digits long.');
    return false;
  }

  const expiration = new Date(expirationDate);

  const currentDate = new Date();
  if (expiration <= currentDate) {
    console.error('Invalid expiration date. It must be in the future.');
    return false;
  }

  return true;
}


async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User information missing.' });
  }

  const { userId } = req.user;
  console.log('User ID:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized. User ID missing in payload.' });
  }

  const { cardNumber, pin, expirationDate } = req.body;

  if (!cardNumber || !pin || !expirationDate) {
    return res.status(400).json({ error: 'Missing required fields: cardNumber, pin, or expirationDate.' });
  }

  try {
    const isValid = validateCreditCard(cardNumber, pin, expirationDate);

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid credit card details.' });
    }

    res.status(200).json({ message: 'Credit card details are valid.' });
  } catch (error: any) {
    console.error('Error validating credit card:', error.message);
    res.status(500).json({ error: 'An error occurred while validating the credit card.' });
  }
}

export default authMiddleware(handler);
import { NextApiRequest, NextApiResponse } from 'next';
import { searchCitiesAndAirports } from '@/controllers/flightController'; // Adjust the import path


/**
 * API endpoint to search for cities and airports by keyword.
 *
 * @param req - Next.js API request object.
 * @param res - Next.js API response object.
 * aided by chatgpt
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  const { keyword } = req.query;

  if (!keyword) {
    return res.status(400).json({ error: 'Missing required query parameter: keyword' });
  }

  try {
    const results = await searchCitiesAndAirports(keyword as string);
    res.status(200).json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
//@ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { listAirportsWrapper } from '@/controllers/bookingController';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Get all airports
    const airports = await listAirportsWrapper();
    
    // Normalize the query for case-insensitive comparison
    const normalizedQuery = query.toLowerCase().trim();
    
    // Find matching airports
    const matches = airports.filter(airport => {
      const airportCode = airport.code.toLowerCase();
      const airportName = airport.name.toLowerCase();
      const cityName = airport.city.toLowerCase();
      
      return airportCode.includes(normalizedQuery) || 
             airportName.includes(normalizedQuery) || 
             cityName.includes(normalizedQuery);
    });
    
    if (matches.length === 0) {
      return res.status(404).json({ error: 'No matching cities found' });
    }
    
    // Extract unique cities from matches
    const uniqueCities = [...new Set(matches.map(airport => airport.city))];
    
    // Return the first matching city
    return res.status(200).json({ 
      city: uniqueCities[0],
      allMatches: uniqueCities
    });
    
  } catch (error) {
    console.error('Error in getcity API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 
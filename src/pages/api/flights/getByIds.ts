// pages/api/flights/getByIds.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getFlightById } from '@/controllers/flightController';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract flightIds from query
  const { flightIds } = req.query;

  if (!flightIds) {
    return res.status(400).json({ error: 'Missing flightIds parameter' });
  }

  // flightIds could be a string or string[]
  // Normalize into an array of IDs
  let ids: string[];
  if (Array.isArray(flightIds)) {
    // e.g. flightIds=["id1","id2","id3"]
    ids = flightIds;
  } else {
    // e.g. flightIds="id1,id2,id3"
    ids = flightIds.split(',');
  }

  // Fetch each flight
  const flights = [];
  for (const id of ids) {
    const flight = await getFlightById(id.trim());
    if ('error' in flight) {
      // If any fetch fails, decide how to handle:
      // Option 1: Return partial success + error
      // Option 2: Stop & return error
      // For simplicity, let's skip the failing flight or you could return an error
      console.error(flight.error);
      // We'll skip it in this example
      continue;
    }
    flights.push(flight);
  }

  // Sort by departureTime ascending
  flights.sort((a: any, b: any) => {
    return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime();
  });

  return res.status(200).json({ flights });
}

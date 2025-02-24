/**
* Retrieves flights for a given origin, destination, and date in AFS. 
* The response typically includes one or more flight itineraries. 
* 
* @function listFlights
* @param {string} apiKey - Your AFS API key (SHA-256 of your student ID).
* @param {string} origin - Origin city name or airport code.
* @param {string} destination - Destination city name or airport code.
* @param {string} date - Departure date in YYYY-MM-DD format.
* @returns {Promise<object|{error: string}>} A promise that resolves to one of:
*   - An object with a `results` array containing flight itineraries: 
*       { results: [ { legs: number, flights: [...] }, ... ] }
*   - An error object: { error: string }
* 
* @example
* const result = await listFlights("your-api-key", "Toronto", "Zurich", "2025-04-10");
* if ('error' in result) {
*   console.error("Error fetching flights:", result.error);
* } else {
*   console.log("Flights:", result.results);
*   // Output: Flights: [ { legs: 1, flights: [ { airline: 'Lufthansa', flight: 'LH123', departure: '2025-04-10T12:00:00Z', arrival: '2025-04-10T15:00:00Z', origin: 'YYZ', destination: 'ZRH' } ] } ]
* }
* aided by chatgpt
*/
export async function listFlights(
  apiKey: string,
  origin: string,
  destination: string,
  date: string
) {
  try {
    const url = new URL('https://advanced-flights-system.replit.app/api/flights');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', destination);
    url.searchParams.set('date', date);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch flights. Status: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
  //   console.log(data);
    return data;
  } catch (err: any) {
    return { error: `Error fetching flights: ${err.message}` };
  }
}




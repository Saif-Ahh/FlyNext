// export listflights and validatelocations 




/**
 * Retrieves a list of all cities that exist in the Advanced Flights System (AFS).
 * 
 * @function listCities
 * @param {string} apiKey - Your AFS API key (SHA-256 of your student ID).
 * @returns {Promise<object|{error: string}>} A promise that resolves to one of:
 *   - An array of city objects: [{ city: string, country: string }, ...]
 *   - An error object: { error: string }
 * 
 * @example
 * const result = await listCities("your-api-key");
 * if ('error' in result) {
 *   console.error("Error fetching cities:", result.error);
 * } else {
 *   console.log("Cities:", result);
 *  // Output: Cities: [{ city: 'Singapore', country: 'Singapore' }, ...]
 * }
 * aided by chatgpt
 * }
 */
export async function listCities(apiKey: string) {
  try {
    const response = await fetch('https://advanced-flights-system.replit.app/api/cities', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch cities. Status: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
  //   console.log(data);
    return data;
  } catch (err: any) {
    return { error: `Error fetching cities: ${err.message}` };
  }
}

/**
* Retrieves a list of all airports that exist in the Advanced Flights System (AFS).
* 
* @function listAirports
* @param {string} apiKey - Your AFS API key (SHA-256 of your student ID).
* @returns {Promise<object|{error: string}>} A promise that resolves to one of:
*   - An array of airport objects: [{ id, code, name, city, country }, ...]
*   - An error object: { error: string }
* 
* @example
* const result = await listAirports("your-api-key");
* if ('error' in result) {
*   console.error("Error fetching airports:", result.error);
* } else {
*   console.log("Airports:", result);
*  // Output: Airports: [{ id: 'SIN', code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' }, ...]
* }
* aided by chatgpt
*/
export async function listAirports(apiKey: string) {
  try {
    const response = await fetch('https://advanced-flights-system.replit.app/api/airports', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch airports. Status: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
  //   console.log(data);
    return data;
  } catch (err: any) {
    return { error: `Error fetching airports: ${err.message}` };
  }
}

/**
* Retrieves a list of all airlines that exist in the Advanced Flights System (AFS).
* 
* @function listAirlines
* @param {string} apiKey - Your AFS API key (SHA-256 of your student ID).
* @returns {Promise<object|{error: string}>} A promise that resolves to one of:
*   - An array of airline objects: [{ name, code, base: {...} }, ...]
*   - An error object: { error: string }
* 
* @example
* const result = await listAirlines("your-api-key");
* if ('error' in result) {
*   console.error("Error fetching airlines:", result.error);
* } else {
*   console.log("Airlines:", result);
* // Output: Airlines: [{ name: 'Singapore Airlines', code: 'SQ', base: { id: 'SIN', code: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' } }, ...]
* }
* aided by chatgpt
*/
async function listAirlines(apiKey: string) {
  try {
    const response = await fetch('https://advanced-flights-system.replit.app/api/airlines', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!response.ok) {
      return {
        error: `Failed to fetch airlines. Status: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
  //   console.log(data);
    return data;
  } catch (err: any) {
    return { error: `Error fetching airlines: ${err.message}` };
  }
}

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



/**
* Creates a new booking in the Advanced Flights System.
* 
* @function createBooking
* @param {string} apiKey - Your AFS API key (SHA-256 of your student ID).
* @param {BookingRequest} booking - Details required to create the booking.
* @returns {Promise<object|{error: string}>} A promise that resolves to one of:
*   - A booking confirmation object containing fields like `bookingReference`, `ticketNumber`, etc.
*   - An error object: { error: string }
* 
* @example
* const booking = {
*   firstName: "Ali",
*   lastName: "Marez",
*   email: "test@test.com",
*   passportNumber: "123239934",
*   flightIds: ["actual-flight-id-from-listFlights"]
* };
* const result = await createBooking("your-api-key", booking);
* if ('error' in result) {
*   console.error("Error creating booking:", result.error);
* } else {
*   console.log("Booking created:", result);
*  // Output: Booking created: { bookingReference: 'ABC123', ticketNumber: '1234567890', ... }
* }
* aided by chatgpt
*/
interface BookingRequest {
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  flightIds: string[];
}

export async function createBooking(apiKey: string, booking: BookingRequest) {
  try {
    const response = await fetch('https://advanced-flights-system.replit.app/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify(booking)
    });

    if (!response.ok) {
      return {
        error: `Failed to create booking. Status: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
  //   console.log(data);
    return data;
  } catch (err: any) {
    return { error: `Error creating booking: ${err.message}` };
  }
}

/**
* Checks if a given city is listed by AFS.
*
* @function cityExists
* @param {string} apiKey - Your AFS API key.
* @param {string} cityName - The city name to check (e.g., "Atlanta").
* @returns {Promise<boolean | { error: string }>}
*   - `true` if the city is found
*   - `false` if not found
*   - `{ error: string }` if there was an error fetching or parsing data
* aided by chatgpt
*/
export async function cityExists(apiKey: string, cityName: string) {
  const result = await listCities(apiKey);

  if ("error" in result) {
    return { error: result.error };
  }

  const found = result.some(
    (entry: { city: string; country: string }) =>
      entry.city.toLowerCase() === cityName.toLowerCase()
  );
  
  return found;
}

/**
 * Checks if a given airport code is listed by AFS (e.g., "ATL" or "PEK").
 *
 * @function airportCodeExists
 * @param {string} apiKey - Your AFS API key.
 * @param {string} code - The airport code (e.g., "ATL").
 * @returns {Promise<boolean | { error: string }>}
 *   - `true` if the airport code is found
 *   - `false` if not found
 *   - `{ error: string }` if there was an error fetching or parsing data
 * aided by chatgpt
 */
export async function airportCodeExists(apiKey: string, code: string) {
  const result = await listAirports(apiKey);

  if ("error" in result) {
    return { error: result.error };
  }

  const found = result.some(
    (airport: { code: string }) => airport.code.toLowerCase() === code.toLowerCase()
  );
  
  return found;
}

/**
 * Checks if a given airport name exists in AFS, and if so, returns its airport code.
 * 
 * Example: "Hartsfield–Jackson Atlanta International Airport" -> "ATL"
 *
 * @function findAirportCodeByName
 * @param {string} apiKey - Your AFS API key.
 * @param {string} airportName - The full airport name (e.g., "Hartsfield–Jackson Atlanta International Airport").
 * @returns {Promise<string | { error: string }>}
 *   - The airport code (e.g., "ATL") if found
 *   - `{ error: string }` if not found or if there was an error
 * aided by chatgpt
 * 
 */
export async function findAirportCodeByName(apiKey: string, airportName: string) {
  const result = await listAirports(apiKey);

  if ("error" in result) {
    return { error: result.error };
  }

  const match = result.find(
    (airport: { code: string; name: string }) =>
      airport.name.toLowerCase() === airportName.toLowerCase()
  );

  if (!match) {
    return { error: `Airport not found for name: ${airportName}` };
  }

  return match.code; 
}


interface ValidationResult {
  error?: string;
  source?: string;
  destination?: string;
}

/**
 * Validate source and destination strings as either:
 * - An existing city
 * - An existing airport code
 * - A known airport name (converted to code)
 *
 * @param apiKey - Your AFS API key
 * @param source - City name, airport code, or airport name
 * @param destination - City name, airport code, or airport name
 * @returns An object containing either { error: string } or the validated { source, destination }
 * aided by chatgpt
 */
export async function validateLocations(
  apiKey: string,
  source: string,
  destination: string
): Promise<ValidationResult> {

  let result = await cityExists(apiKey, source);

  if (typeof result === 'object' && result !== null && 'error' in result) {
    return { error: result.error };
  }

  if (result === false) {
    let codeCheck = await airportCodeExists(apiKey, source);

    if (typeof codeCheck === 'object' && codeCheck !== null && 'error' in codeCheck) {
      return { error: codeCheck.error };
    }
    if (codeCheck === false) {
      let nameCheck = await findAirportCodeByName(apiKey, source);

      if (typeof nameCheck === 'object' && nameCheck !== null && 'error' in nameCheck) {
        return { error: nameCheck.error };
      }
      source = nameCheck as string;
    }
  }

  result = await cityExists(apiKey, destination);

  if (typeof result === 'object' && result !== null && 'error' in result) {
    return { error: result.error };
  }
  if (result === false) {
    let codeCheck = await airportCodeExists(apiKey, destination);

    if (typeof codeCheck === 'object' && codeCheck !== null && 'error' in codeCheck) {
      return { error: codeCheck.error };
    }
    if (codeCheck === false) {
      let nameCheck = await findAirportCodeByName(apiKey, destination);

      if (typeof nameCheck === 'object' && nameCheck !== null && 'error' in nameCheck) {
        return { error: nameCheck.error };
      }
      destination = nameCheck as string;
    }
  }

  return { source, destination };
}



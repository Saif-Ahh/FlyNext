import dotenv from 'dotenv';
import { listFlights, validateLocations, listCities, listAirports } from '../services/flightService';

dotenv.config();

const apiKey = process.env.AFS_API_KEY as string;

export async function getOneWayFlights(
    source: string,
    destination: string,
    departureDate: string,
) {
    const validated = await validateLocations(apiKey, source, destination);
    if ("error" in validated) {
        return validated;
    }

    const now = new Date();
    const [year, month, day] = departureDate.split('-').map(Number);
    const departure = new Date(year, month - 1, day);
    if (departure < now) {
        return { error: 'Departure date cannot be in the past.' };
    }

    if (source === destination) {
        return { error: 'Source and destination cannot be the same.' };
    }

    source = validated.source!;
    destination = validated.destination!;

    const flights = await listFlights(apiKey, source, destination, departureDate);

    return flights;
}

export async function getRoundTripFlights(
    source: string,
    destination: string,
    departureDate: string,
    returnDate: string,
) {
    const validated = await validateLocations(apiKey, source, destination);
    if ("error" in validated) {
        return validated;
    }

    const now = new Date();
    const [year, month, day] = departureDate.split('-').map(Number);
    const departure = new Date(year, month - 1, day);
    if (departure < now) {
        return { error: 'Departure date cannot be in the past.' };
    }

    const [ryear, rmonth, rday] = returnDate.split('-').map(Number);
    const returnD = new Date(ryear, rmonth - 1, rday);
    if (returnD < departure) {
        return { error: 'Return date must be after departure date.' };
    }

    source = validated.source!;
    destination = validated.destination!;

    const outbound = await listFlights(apiKey, source, destination, departureDate);
    const inbound = await listFlights(apiKey, destination, source, returnDate);

    return { outbound, inbound };
}

export function getFlightDetails(itinerary: FlightItinerary): FlightDetails {
    const { legs, flights } = itinerary;

    const totalDuration = flights.reduce((sum: number, flight: FlightLeg) => sum + flight.duration, 0);
    const totalPrice = flights.reduce((sum: number, flight: FlightLeg) => sum + flight.price, 0);
    const currency = flights[0].currency;

    const processedLegs = flights.map((flight: FlightLeg, index: number) => {
        const leg: any = {
            departureTime: new Date(flight.departureTime).toLocaleString(),
            arrivalTime: new Date(flight.arrivalTime).toLocaleString(),
            duration: flight.duration,
            origin: `${flight.origin.city} (${flight.origin.code})`,
            destination: `${flight.destination.city} (${flight.destination.code})`,
            airline: flight.airline.name,
            flightNumber: flight.flightNumber,
        };

        if (index < flights.length - 1) {
            const nextFlight = flights[index + 1];
            const layoverDuration =
                (new Date(nextFlight.departureTime).getTime() - new Date(flight.arrivalTime).getTime()) /
                (1000 * 60);
            leg.layover = {
                duration: layoverDuration,
                location: `${flight.destination.city} (${flight.destination.code})`,
            };
        }

        return leg;
    });

    const flightIds = flights.map((flight) => flight.id);

    return {
        totalDuration,
        totalPrice,
        currency,
        legs: processedLegs,
        flightIds,
    };
}

interface FlightLeg {
    id: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    origin: {
        code: string;
        name: string;
        city: string;
        country: string;
    };
    destination: {
        code: string;
        name: string;
        city: string;
        country: string;
    };
    duration: number;
    price: number;
    currency: string;
    availableSeats: number;
    status: string;
    airline: {
        code: string;
        name: string;
    };
}

interface FlightItinerary {
    legs: number;
    flights: FlightLeg[];
}

interface FlightDetails {
    totalDuration: number;
    totalPrice: number;
    currency: string;
    legs: any[];
    flightIds: string[];
}

export async function findTripByFlightNumbers(
    date: string,
    origin: string,
    destination: string,
    flightNumbers: string[],
): Promise<FlightItinerary> {
    const flightsResponse = await listFlights(apiKey, origin, destination, date);

    if ('error' in flightsResponse) {
        throw new Error(flightsResponse.error);
    }

    for (const itinerary of flightsResponse.results) {
        const itineraryFlightNumbers = itinerary.flights.map((flight: any) => flight.flightNumber);

        if (arraysMatch(flightNumbers, itineraryFlightNumbers)) {
            return {
                legs: itinerary.legs,
                flights: itinerary.flights.map((flight: any) => ({
                    id: flight.id,
                    flightNumber: flight.flightNumber,
                    departureTime: flight.departureTime,
                    arrivalTime: flight.arrivalTime,
                    origin: flight.origin,
                    destination: flight.destination,
                    duration: flight.duration,
                    price: flight.price,
                    currency: flight.currency,
                    availableSeats: flight.availableSeats,
                    status: flight.status,
                    airline: flight.airline,
                })),
            };
        }
    }

    throw new Error('No flights found matching the provided flight numbers.');
}

function arraysMatch(arr1: string[], arr2: string[]): boolean {
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false;
    }
    return true;
}

interface City {
    city: string;
    country: string;
}

interface Airport {
    id: string;
    code: string;
    name: string;
    city: string;
    country: string;
}

export async function searchCitiesAndAirports(
    keyword: string
): Promise<{
    cities: string[];
    airportsByName: { code: string; name: string }[];
    airportsByCode: { code: string; name: string }[];
}> {
    const citiesResponse = await listCities(apiKey);
    const airportsResponse = await listAirports(apiKey);

    const lowerKeyword = keyword.toLowerCase();

    const matchingCities = (citiesResponse as City[])
        .filter((city) => city.city.toLowerCase().includes(lowerKeyword))
        .map((city) => city.city);

    const matchingAirportsByName = (airportsResponse as Airport[])
        .filter((airport) => airport.name.toLowerCase().includes(lowerKeyword))
        .map((airport) => ({
            code: airport.code,
            name: airport.name,
        }));

    const matchingAirportsByCode = (airportsResponse as Airport[])
        .filter((airport) => airport.code.toLowerCase().includes(lowerKeyword))
        .map((airport) => ({
            code: airport.code,
            name: airport.name,
        }));

    return {
        cities: matchingCities,
        airportsByName: matchingAirportsByName,
        airportsByCode: matchingAirportsByCode,
    };
}


import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.AFS_API_KEY as string;

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


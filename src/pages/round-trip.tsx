// @ts-nocheck
// pages/round-trip.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaPlane, FaClock, FaChair, FaBuilding, FaGlobe, FaHotel, FaStar } from 'react-icons/fa';

interface Flight {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  originId: string;
  destinationId: string;
  duration: number;
  price: number;
  currency: string;
  availableSeats: number;
  status: string;
  airline: {
    code: string;
    name: string;
  };
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
}

interface FlightResult {
  legs: number;
  flights: Flight[];
}

interface RoundTripResponse {
  outboundResults: FlightResult[];
  inboundResults: FlightResult[];
}

interface Hotel {
  id: string;
  name: string;
  location: string;
  starRating: number;
  price: number;
  pictures: string[];
}

interface BookingResult {
  bookingReference: string;
  ticketNumber: string;
  status: string;
  createdAt?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  passportNumber?: string;
  flights?: Flight[];
  flightDetails?: {
    origin: string;
    destination: string;
    departureTime: string;
    arrivalTime: string;
    airline: string;
    flightNumber: string;
    price: number;
    currency: string;
  };
}

export default function RoundTrip() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [outboundFlights, setOutboundFlights] = useState<FlightResult[]>([]);
  const [inboundFlights, setInboundFlights] = useState<FlightResult[]>([]);
  const [selectedOutboundIndex, setSelectedOutboundIndex] = useState<number | null>(null);
  const [selectedInboundIndex, setSelectedInboundIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showCardModal, setShowCardModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    pin: '',
    expirationDate: ''
  });
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);

  // Hotel suggestions (optional)
  const [hotelSuggestions, setHotelSuggestions] = useState<Hotel[]>([]);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const [destinationCity, setDestinationCity] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  useEffect(() => {
    const { source, destination, departureDate, returnDate } = router.query;
    
    if (!source || !destination || !departureDate || !returnDate) {
      router.push('/');
      return;
    }

    const fetchFlights = async () => {
      try {
        const response = await fetch(
          `/api/flights/round-trip?source=${source}&destination=${destination}&departureDate=${departureDate}&returnDate=${returnDate}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch flights');
        }

        const data = await response.json();
        console.log('API Response:', data); // Debug log
        
        // Check if data exists and has the expected structure
        if (data && data.outbound && data.outbound.results && data.inbound && data.inbound.results) {
          setOutboundFlights(data.outbound.results);
          setInboundFlights(data.inbound.results);
          
          // Extract destination city from the first outbound flight's destination
          if (data.outbound.results.length > 0 && data.outbound.results[0].flights.length > 0) {
            const finalFlight = data.outbound.results[0].flights[data.outbound.results[0].flights.length - 1];
            setDestinationCity(finalFlight.destination.city);
          }
        } else {
          console.error('Unexpected API response structure:', data);
          setError('Invalid flight data received. Please try again.');
        }
      } catch (error) {
        setError('Failed to load flights. Please try again later.');
        console.error('Error fetching flights:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlights();
  }, [router.query]);

  // Fetch hotel suggestions when the destination city changes
  useEffect(() => {
    if (destinationCity) {
      fetchHotelSuggestions(destinationCity);
    }
  }, [destinationCity]);

  // Function to fetch hotel suggestions
  const fetchHotelSuggestions = async (location: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping hotel suggestions');
        return;
      }

      console.log(`Fetching hotel suggestions for location: ${location}`);
      
      const response = await fetch(`http://localhost:80/api/hotels/getHotelSuggestions?location=${encodeURIComponent(location)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch hotel suggestions:', response.status, response.statusText);
        return;
      }

      const data = await response.json();
      console.log('Hotel suggestions API response:', data);
      
      if (data && data.hotels && Array.isArray(data.hotels) && data.hotels.length > 0) {
        // Process the hotel data to ensure price is properly formatted
        const processedHotels = data.hotels.map((hotel: Hotel) => {
          // Debug the price value
          console.log(`Hotel ${hotel.name} price before processing:`, hotel.price, typeof hotel.price);
          
          // Handle different price formats
          let processedPrice = null;
          
          if (typeof hotel.price === 'number') {
            processedPrice = hotel.price;
          } else if (typeof hotel.price === 'string') {
            // Try to convert string to number
            const numericPrice = parseFloat(hotel.price);
            if (!isNaN(numericPrice) && numericPrice > 0) {
              processedPrice = numericPrice;
            }
          }
          
          console.log(`Hotel ${hotel.name} price after processing:`, processedPrice);
          
          return {
            ...hotel,
            price: processedPrice
          };
        });
        
        setHotelSuggestions(processedHotels);
        // Don't automatically show hotel suggestions here
        console.log(`Found ${processedHotels.length} hotel suggestions for ${location}`);
      } else {
        console.log(`No hotel suggestions found for ${location}`);
        setHotelSuggestions([]);
      }
    } catch (error) {
      console.error('Error fetching hotel suggestions:', error);
    }
  };

  // Function to handle hotel suggestion click
  const handleHotelSuggestionClick = (hotel: Hotel) => {
    // Get the check-in and check-out dates from the booked flights
    const checkInDate = outboundFlights[selectedOutboundIndex!].flights[outboundFlights[selectedOutboundIndex!].flights.length - 1].arrivalTime.split('T')[0];
    const checkOutDate = inboundFlights[selectedInboundIndex!].flights[0].departureTime.split('T')[0];
    
    // Navigate to hotels page with the selected dates
    router.push({
      pathname: '/hotels',
      query: {
        destination: destinationCity,
        checkInDate,
        checkOutDate
      }
    });
  };

  // Function to handle booking completion
  const handleBookingComplete = () => {
    console.log('handleBookingComplete called');
    
    // Use setTimeout to ensure this runs after the previous alert is dismissed
    setTimeout(() => {
      // Show modal asking if user wants to see hotel suggestions
      const wantHotels = window.confirm('Would you like to see hotel suggestions for your destination?');
      console.log('User response to hotel suggestions:', wantHotels);
      
      if (wantHotels) {
        // Show hotel suggestions modal
        console.log('Setting showHotelSuggestions to true');
        setShowHotelSuggestions(true);
      } else {
        // Return to home page
        console.log('Redirecting to home page');
        router.push('/');
      }
    }, 100); // Small delay to ensure the previous alert is dismissed
  };

  // -----------------------------------------
  // Add to Cart (Books Outbound + Inbound)
  // -----------------------------------------
  const handleAddToCart = async () => {
    if (selectedOutboundIndex === null || selectedInboundIndex === null) {
      alert('Please select both outbound and inbound flights');
      return;
    }

    try {
      // Check if there's already a flight booking reference
      const existingBookingRef = localStorage.getItem('flightBookingReference');
      if (existingBookingRef) {
        alert('You already have items in your cart. Please checkout first.');
        router.push('/');
        return;
      }

      // Must be logged in
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to book flights');
        router.push('/login');
        return;
      }

      // Combine flight IDs from selected outbound + inbound
      const outboundFlight = outboundFlights[selectedOutboundIndex];
      const inboundFlight = inboundFlights[selectedInboundIndex];

      const allFlightIds = [
        ...outboundFlight.flights.map((f) => f.id),
        ...inboundFlight.flights.map((f) => f.id)
      ].join(',');

      // Book the flights
      const bookingResponse = await fetch(`/api/bookings/flightbooking?flightIds=${allFlightIds}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const bookingData = await bookingResponse.json();
      if (bookingData.error) {
        console.error('Booking error:', bookingData.error);
        alert(`Booking error: ${bookingData.error}`);
        return;
      }

      console.log('Booking Result:', bookingData);

      // The API always returns a bookingReference if successful, or newBooking
      const bookingReference =
        bookingData.bookingReference ||
        bookingData.newBooking?.id ||
        `FB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Save flight booking reference in localStorage
      localStorage.setItem('flightBookingReference', bookingReference);

      // Gather cart item info
      // E.g., use arrival from outbound for checkIn, departure from inbound for checkOut
      const destinationCity = inboundFlight.flights[0].origin.city;
      const checkInDate = outboundFlight.flights[outboundFlight.flights.length - 1].arrivalTime;
      const checkOutDate = inboundFlight.flights[0].departureTime;

      // Combine flight IDs into a single string
      const outboundFlightIds = outboundFlight.flights.map((f) => f.id).join(',');
      const inboundFlightIds = inboundFlight.flights.map((f) => f.id).join(',');
      const flightIds = `${outboundFlightIds},${inboundFlightIds}`;

      // Calculate total price
      const totalPrice =
        outboundFlight.flights.reduce((sum, f) => sum + f.price, 0) +
        inboundFlight.flights.reduce((sum, f) => sum + f.price, 0);

      // Build the cart item
      const cartItem = {
        type: 'round-trip',
        destinationCity,
        checkInDate,
        checkOutDate,
        flightIds,
        outboundFlight,
        inboundFlight,
        totalPrice,
        bookingReference
      };

      // Add it to localStorage cart
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
      existingCart.push(cartItem);
      localStorage.setItem('cart', JSON.stringify(existingCart));

      alert('Flights booked and added to cart successfully!');

      // After successful booking, show the booking completion modal
      console.log('Calling handleBookingComplete after successful booking');
      handleBookingComplete();
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to book flights. Please try again.');
    }
  };

  // formatting helpers
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Round Trip Flights - FlyNext</title>
        <meta name="description" content="Search and book round trip flights" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
              <FaPlane className="mr-2" />
              Back to Search
            </Link>
          </div>

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Available Flights</h1>
            <div className="flex space-x-3">
              {/* "Add to Cart" button for booking */}
              <button
                onClick={handleAddToCart}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={selectedOutboundIndex === null || selectedInboundIndex === null}
              >
                Add to Cart
              </button>
              {/* If you want direct booking with card modal */}
              {/* 
              <button
                onClick={handleBookNow}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={selectedOutboundIndex === null || selectedInboundIndex === null}
              >
                Book Selected Flights
              </button> 
              */}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content - Flights */}
            <div className="lg:col-span-2">
              {/* Outbound Flights */}
              <div className="mb-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full mr-2">Outbound</span>
                  Flights
                </h2>
                {outboundFlights.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">No outbound flights found</h3>
                    <p className="text-gray-600">Please try different search criteria.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {outboundFlights.map((result, index) => (
                      <div
                        key={index}
                        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                          selectedOutboundIndex === index ? 'ring-2 ring-blue-600' : ''
                        }`}
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {result.flights[0].origin.city} ({result.flights[0].origin.code}) →{' '}
                                {result.flights[result.flights.length - 1].destination.city} (
                                {result.flights[result.flights.length - 1].destination.code})
                              </h3>
                              <p className="text-sm text-gray-500">
                                {formatDate(result.flights[0].departureTime)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">
                                {result.flights[0].currency}{' '}
                                {result.flights.reduce((sum, flight) => sum + flight.price, 0)}
                              </p>
                              <p className="text-sm text-gray-500">Total Price</p>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-4">
                            {result.flights.map((flight, flightIndex) => (
                              <div key={flight.id} className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <FaPlane className="text-gray-400 mr-2" />
                                    <span className="font-medium">{flight.airline.name}</span>
                                    <span className="ml-2 text-gray-500">({flight.flightNumber})</span>
                                  </div>
                                  <div className="flex items-center text-gray-500">
                                    <FaClock className="mr-1" />
                                    <span>{formatDuration(flight.duration)}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {formatTime(flight.departureTime)} - {flight.origin.code}
                                    </p>
                                    <p className="text-sm text-gray-500">{flight.origin.name}</p>
                                  </div>
                                  <div className="text-center">
                                    <div className="w-24 h-px bg-gray-300"></div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {formatTime(flight.arrivalTime)} - {flight.destination.code}
                                    </p>
                                    <p className="text-sm text-gray-500">{flight.destination.name}</p>
                                  </div>
                                </div>

                                {flightIndex < result.flights.length - 1 && (
                                  <div className="mt-2 text-sm text-gray-500">
                                    <FaBuilding className="inline-block mr-1" />
                                    {formatDuration(
                                      (new Date(result.flights[flightIndex + 1].departureTime).getTime() -
                                        new Date(flight.arrivalTime).getTime()) /
                                        (1000 * 60)
                                    )}{' '}
                                    layover at {flight.destination.name} ({flight.destination.code})
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center text-gray-500">
                                <FaChair className="mr-1" />
                                <span>{result.flights[0].availableSeats} seats left</span>
                              </div>
                              <div className="flex items-center text-gray-500">
                                <FaGlobe className="mr-1" />
                                <span>
                                  {result.legs} {result.legs === 1 ? 'leg' : 'legs'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedOutboundIndex(index)}
                              className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                                selectedOutboundIndex === index
                                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              {selectedOutboundIndex === index ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inbound Flights */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full mr-2">Return</span>
                  Flights
                </h2>
                {inboundFlights.length === 0 ? (
                  <div className="text-center py-12">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">No return flights found</h3>
                    <p className="text-gray-600">Please try different search criteria.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {inboundFlights.map((result, index) => (
                      <div
                        key={index}
                        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                          selectedInboundIndex === index ? 'ring-2 ring-green-600' : ''
                        }`}
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {result.flights[0].origin.city} ({result.flights[0].origin.code}) →{' '}
                                {result.flights[result.flights.length - 1].destination.city} (
                                {result.flights[result.flights.length - 1].destination.code})
                              </h3>
                              <p className="text-sm text-gray-500">
                                {formatDate(result.flights[0].departureTime)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">
                                {result.flights[0].currency}{' '}
                                {result.flights.reduce((sum, flight) => sum + flight.price, 0)}
                              </p>
                              <p className="text-sm text-gray-500">Total Price</p>
                            </div>
                          </div>

                          <div className="border-t border-gray-200 pt-4">
                            {result.flights.map((flight, flightIndex) => (
                              <div key={flight.id} className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center">
                                    <FaPlane className="text-gray-400 mr-2" />
                                    <span className="font-medium">{flight.airline.name}</span>
                                    <span className="ml-2 text-gray-500">({flight.flightNumber})</span>
                                  </div>
                                  <div className="flex items-center text-gray-500">
                                    <FaClock className="mr-1" />
                                    <span>{formatDuration(flight.duration)}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {formatTime(flight.departureTime)} - {flight.origin.code}
                                    </p>
                                    <p className="text-sm text-gray-500">{flight.origin.name}</p>
                                  </div>
                                  <div className="text-center">
                                    <div className="w-24 h-px bg-gray-300"></div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {formatTime(flight.arrivalTime)} - {flight.destination.code}
                                    </p>
                                    <p className="text-sm text-gray-500">{flight.destination.name}</p>
                                  </div>
                                </div>

                                {flightIndex < result.flights.length - 1 && (
                                  <div className="mt-2 text-sm text-gray-500">
                                    <FaBuilding className="inline-block mr-1" />
                                    {formatDuration(
                                      (new Date(result.flights[flightIndex + 1].departureTime).getTime() -
                                        new Date(flight.arrivalTime).getTime()) /
                                        (1000 * 60)
                                    )}{' '}
                                    layover at {flight.destination.name} ({flight.destination.code})
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="mt-6 flex justify-between items-center">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center text-gray-500">
                                <FaChair className="mr-1" />
                                <span>{result.flights[0].availableSeats} seats left</span>
                              </div>
                              <div className="flex items-center text-gray-500">
                                <FaGlobe className="mr-1" />
                                <span>
                                  {result.legs} {result.legs === 1 ? 'leg' : 'legs'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedInboundIndex(index)}
                              className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                                selectedInboundIndex === index
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-green-600 text-white hover:bg-green-700'
                              }`}
                            >
                              {selectedInboundIndex === index ? 'Selected' : 'Select'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hotel Suggestions Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <div className="flex items-center mb-4">
                  <FaHotel className="text-blue-600 mr-2" />
                  <h2 className="text-xl font-semibold text-gray-900">Hotel Suggestions</h2>
                </div>
                
                {!destinationCity ? (
                  <p className="text-gray-500">Select flights to see hotel suggestions</p>
                ) : hotelSuggestions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hotel suggestions found for {destinationCity}</p>
                    <p className="text-sm text-gray-400 mt-2">Try searching for hotels directly</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Hotels in <span className="font-medium">{destinationCity}</span>
                    </p>
                    {hotelSuggestions.map((hotel, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => handleHotelSuggestionClick(hotel)}
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                            <p className="text-gray-600">{hotel.location}</p>
                            <div className="flex items-center mt-2">
                              {[...Array(5)].map((_, i) => (
                                <FaStar
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < hotel.starRating ? 'text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          {hotel.pictures && hotel.pictures.length > 0 && (
                            <div className="ml-4">
                              <img
                                src={hotel.pictures[0]}
                                alt={hotel.name}
                                className="w-24 h-24 object-cover rounded"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Modal (Book Now flow) */}
        {showCardModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Enter Card Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Card Number</label>
                  <input
                    type="text"
                    value={cardDetails.cardNumber}
                    onChange={(e) =>
                      setCardDetails({ ...cardDetails, cardNumber: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="4111111111111111"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PIN</label>
                  <input
                    type="password"
                    value={cardDetails.pin}
                    onChange={(e) =>
                      setCardDetails({ ...cardDetails, pin: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expiration Date
                  </label>
                  <input
                    type="date"
                    value={cardDetails.expirationDate}
                    onChange={(e) =>
                      setCardDetails({ ...cardDetails, expirationDate: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowCardModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCardSubmit}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Booking Confirmation Modal */}
        {bookingResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-16 relative">
              {/* Sticky Header */}
              <div className="sticky top-0 bg-white pb-4 z-10 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-green-600">
                        {bookingResult.status || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Booking Reference</p>
                      <p className="font-medium">
                        {bookingResult.bookingReference || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ticket Number</p>
                      <p className="font-medium">{bookingResult.ticketNumber || 'N/A'}</p>
                    </div>
                    {bookingResult.createdAt && (
                      <div>
                        <p className="text-sm text-gray-600">Booking Date</p>
                        <p className="font-medium">
                          {new Date(bookingResult.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 mt-4">
                {/* Potentially show passenger details */}
                {/* Potentially show flight details from bookingResult.flights */}
                {/* And so on */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      if (bookingResult?.bookingReference) {
                        const token = localStorage.getItem('token');
                        if (token) {
                          fetch(
                            `/api/bookings/flightbookingpdf?bookingReference=${bookingResult.bookingReference}`,
                            {
                              method: 'GET',
                              headers: {
                                Authorization: `Bearer ${token}`
                              }
                            }
                          )
                            .then((response) => {
                              if (response.ok) {
                                return response.blob();
                              }
                              throw new Error('Failed to fetch invoice');
                            })
                            .then((blob) => {
                              const url = window.URL.createObjectURL(blob);
                              window.open(url, '_blank');
                            })
                            .catch((error) => {
                              console.error('Error fetching invoice:', error);
                              alert('Failed to generate invoice. Please try again later.');
                            });
                        } else {
                          alert('Please log in to view your invoice');
                          router.push('/login');
                        }
                      }
                    }}
                    className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    Invoice
                  </button>
                  <button
                    onClick={() => {
                      setBookingResult(null);
                      router.push('/');
                    }}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                  >
                    Return to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hotel Suggestions Modal */}
        {showHotelSuggestions && hotelSuggestions.length > 0 && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Hotel Suggestions</h2>
                <button
                  onClick={() => {
                    setShowHotelSuggestions(false);
                    router.push('/');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                We found some great hotels in {destinationCity}. Click on a hotel to view its details.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {hotelSuggestions.map((hotel, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => handleHotelSuggestionClick(hotel)}
                  >
                    <div className="flex items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                        <p className="text-gray-600">{hotel.location}</p>
                        <div className="flex items-center mt-2">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`h-4 w-4 ${
                                i < hotel.starRating ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {hotel.pictures && hotel.pictures.length > 0 && (
                        <div className="ml-4">
                          <img
                            src={hotel.pictures[0]}
                            alt={hotel.name}
                            className="w-24 h-24 object-cover rounded"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowHotelSuggestions(false);
                    router.push('/');
                  }}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}



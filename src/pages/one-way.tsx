// pages/one-way.tsx
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

interface Hotel {
  id: string;
  name: string;
  location: string;
  starRating: number;
  price: number;
  pictures: string[];
}

export default function OneWay() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [selectedFlightIndex, setSelectedFlightIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hotelSuggestions, setHotelSuggestions] = useState<Hotel[]>([]);
  const [showHotelSuggestions, setShowHotelSuggestions] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [destinationCity, setDestinationCity] = useState<string | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [checkInDate, setCheckInDate] = useState<string | null>(null);

  useEffect(() => {
    const { source, destination, departureDate } = router.query;
    
    if (!source || !destination || !departureDate) {
      router.push('/');
      return;
    }

    const fetchFlights = async () => {
      try {
        const response = await fetch(
          `/api/flights/one-way?source=${source}&destination=${destination}&departureDate=${departureDate}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch flights');
        }

        const data = await response.json();
        setFlights(data.results);
        
        // Extract destination city from the first flight's destination
        if (data.results.length > 0 && data.results[0].flights.length > 0) {
          const finalFlight = data.results[0].flights[data.results[0].flights.length - 1];
          setDestinationCity(finalFlight.destination.city);
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
    // Get the check-in date from the booked flight
    const checkInDate = flights[selectedFlightIndex!].flights[flights[selectedFlightIndex!].flights.length - 1].arrivalTime.split('T')[0];
    
    // Show the checkout date modal
    setSelectedHotel(hotel);
    setCheckInDate(checkInDate);
    setShowCheckOutModal(true);
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

  // Function to handle check-out date selection
  const handleCheckOutDateSelect = (date: string) => {
    setShowCheckOutModal(false);
    
    // Navigate to hotels page with the selected dates
    if (destinationCity) {
      // Navigate to hotels page with pre-filled inputs
      router.push({
        pathname: '/hotels',
        query: {
          destination: destinationCity,
          ...(checkInDate && { checkInDate }),
          checkOutDate: date
        }
      });
    }
  };

  // -------------------------------------
  // ADD TO CART (which also books flight)
  // -------------------------------------
  const handleAddToCart = async () => {
    if (selectedFlightIndex === null) {
      alert('Please select a flight');
      return;
    }

    try {
      // Check if there's already a booking reference in localStorage
      const existingBookingRef = localStorage.getItem('flightBookingReference');
      if (existingBookingRef) {
        alert('You already have items in your cart. Please checkout first.');
        router.push('/');
        return;
      }

      // Must be logged in
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to book a flight');
        router.push('/login');
        return;
      }

      // Get the selected flight
      const selectedFlight = flights[selectedFlightIndex];
      
      const flightIds = selectedFlight.flights.map((flight: Flight) => flight.id).join(',');

      // Book the flight
      const bookingResponse = await fetch(`/api/bookings/flightbooking?flightIds=${flightIds}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const bookingData = await bookingResponse.json();
      if (bookingData.error) {
        alert(bookingData.error);
        return;
      }

      // Log booking data
      console.log('Booking Result:', bookingData);

      // Generate or extract the booking reference from the response
      // This depends on how your endpoint returns the reference
      // Let's assume it's in bookingData.newBooking?.id or bookingData.bookingReference:
      const bookingReference =
        bookingData.newBooking?.id ||
        bookingData.bookingReference ||
        `FB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Save booking reference to localStorage
      localStorage.setItem('flightBookingReference', bookingReference);

      // Extract the final destination city
      const destinationCity = selectedFlight.flights[selectedFlight.flights.length - 1].destination.city;
      if (!destinationCity) {
        throw new Error('Could not determine destination city');
      }

      // For one-way flights, set checkOutDate = checkInDate
      const checkInDate = selectedFlight.flights[selectedFlight.flights.length - 1].arrivalTime;
      const checkOutDate = checkInDate;

      const flightIdsString = selectedFlight.flights.map(f => f.id).join(',');

      // Build a cart item
      const cartItem = {
        type: 'one-way',
        destinationCity,
        checkInDate,
        checkOutDate,
        flightIds: flightIdsString,
        flight: selectedFlight,
        totalPrice: selectedFlight.flights.reduce((sum, f) => sum + f.price, 0),
        bookingReference, // store the booking reference
      };

      // Add to cart in localStorage
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
      existingCart.push(cartItem);
      localStorage.setItem('cart', JSON.stringify(existingCart));

      // Notify user
      alert('Flight booked and added to cart successfully!');

      // After successful booking, show the booking completion modal
      console.log('Calling handleBookingComplete after successful booking');
      handleBookingComplete();
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to book flight. Please try again.');
    }
  };

  // Helper functions
  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // -------------------------------------
  // Rendering
  // -------------------------------------
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
        <title>One Way Flights - FlyNext</title>
        <meta name="description" content="Search and book one-way flights" />
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
            <button
              onClick={handleAddToCart}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={selectedFlightIndex === null}
            >
              Add to Cart
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content - Flights */}
            <div className="lg:col-span-2">
              {flights.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">No flights found</h3>
                  <p className="text-gray-600">Please try different search criteria.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {flights.map((result, index) => (
                    <div
                      key={index}
                      className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                        selectedFlightIndex === index ? 'ring-2 ring-blue-600' : ''
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
                            onClick={() => setSelectedFlightIndex(index)}
                            className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                              selectedFlightIndex === index
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          >
                            {selectedFlightIndex === index ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {/* Check-out Date Modal */}
        {showCheckOutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Check-out Date</h2>
              <p className="text-gray-600 mb-4">
                When would you like to check out from your hotel?
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Check-out Date</label>
                  <input
                    type="date"
                    min={checkInDate || ''}
                    onChange={(e) => handleCheckOutDateSelect(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCheckOutModal(false);
                      router.push('/');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
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

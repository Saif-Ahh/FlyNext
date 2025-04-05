// pages/itinerary.tsx
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  FaPlane, FaStar, FaMapMarkerAlt, FaWifi, FaSwimmingPool, FaUtensils,
  FaDumbbell, FaSpa, FaBed, FaCalendarAlt, FaCreditCard
} from 'react-icons/fa';

/** -----------------------
 *  Types / Interfaces
 * -----------------------
 */
interface Flight {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  origin: {
    code: string;
    city: string;
  };
  destination: {
    code: string;
    city: string;
  };
  price: number;
  airline: {
    name: string;
  };
}

interface HotelRoom {
  id: string;
  name: string;
  roomNum: string;
  amenities: string[];
  pricePerNight: number;
  images: string[];
  available?: boolean;
}

interface Hotel {
  id: string;
  name: string;
  location: string;
  address: string;
  starRating: number;
  amenities: string[];
  rooms: HotelRoom[];
  pictures?: string[];
  images?: string[] | { link: string }[];
  logo?: string;
  price?: number; // optional field for a 'starting from' price
}

/** -----------------------
 *  Main Itinerary Page
 * -----------------------
 */
export default function Itinerary() {
  const router = useRouter();
  const { flightIds, city, checkInDate, checkOutDate } = router.query;

  // Loading / Error states
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Flight Data
  const [flights, setFlights] = useState<Flight[]>([]);

  // Hotel Data
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  const [availableAmenities, setAvailableAmenities] = useState<string[]>([]);

  // Filters
  const [filters, setFilters] = useState({
    starRating: 0,
    minPrice: 0,
    maxPrice: 1000,
    amenities: [] as string[],
  });

  // Hotel Selection
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Payment / Booking
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    pin: '',
    expirationDate: '',
  });
  const [bookingResult, setBookingResult] = useState<any>(null);

  /** -----------------------
   *  1. Fetch Flights & Hotels
   * -----------------------
   */
  useEffect(() => {
    // Validate required query params
    if (!flightIds || !city || !checkInDate || !checkOutDate) {
      setIsLoading(false);
      return;
    }

    // 1) Fetch flight details from server or from query
    //    Example: flight details from a dedicated API
    fetch(`http://localhost:80/api/flights/getByIds?flightIds=${flightIds}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch flights');
        return res.json();
      })
      .then((flightData: Flight[]) => {
        setFlights(flightData);
      })
      .catch(err => {
        console.error('Error fetching flights:', err);
        // We won't set error here; we can still proceed with hotels
      });

    // 2) Fetch hotels for the city and checkIn/checkOut
    const fetchHotels = async () => {
      try {
        const params = new URLSearchParams();
        params.append('city', city as string);
        params.append('startDate', checkInDate as string);
        params.append('endDate', checkOutDate as string);
        params.append('starRating', '0');
        params.append('minPrice', '0');
        params.append('maxPrice', '1000');

        const response = await fetch(`/api/hotels/visitorsearch?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch hotels');
        const data = await response.json();

        if (!data.hotels || !Array.isArray(data.hotels)) {
          console.error('Invalid hotels data', data);
          throw new Error('Invalid hotels response');
        }
        setHotels(data.hotels);

        // fetch all amenities for the city
        const aRes = await fetch(
          `/api/hotels/getAllAmenities?location=${encodeURIComponent(city as string)}`
        );
        if (aRes.ok) {
          const aData = await aRes.json();
          if (Array.isArray(aData.allAmenities)) {
            const uniqueAmenities = [...new Set(aData.allAmenities)].map(String);
            setAvailableAmenities(uniqueAmenities);
          }
        }
      } catch (err) {
        console.error('Error fetching hotels:', err);
        setError('Failed to load hotels. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, [flightIds, city, checkInDate, checkOutDate]);

  /** -----------------------
   *  2. Filter Logic
   * -----------------------
   */
  const applyFilters = useCallback(() => {
    if (!hotels || hotels.length === 0) {
      setFilteredHotels([]);
      return;
    }

    // Deep copy to avoid mutating original
    const hotelsCopy = JSON.parse(JSON.stringify(hotels)) as Hotel[];

    // Filter each hotel by star rating, then filter rooms by price & amenities
    const filtered = hotelsCopy.map((hotel) => {
      // Star rating check on hotel level
      if (filters.starRating > 0 && hotel.starRating < filters.starRating) {
        hotel.rooms = []; // no rooms if star rating fails
        return hotel;
      }

      if (hotel.rooms && Array.isArray(hotel.rooms)) {
        hotel.rooms = hotel.rooms.filter(room => {
          // Price
          if (room.pricePerNight < filters.minPrice || room.pricePerNight > filters.maxPrice) {
            return false;
          }
          // Amenities
          if (filters.amenities.length > 0) {
            if (!room.amenities) return false;
            return filters.amenities.every(a => room.amenities.includes(a));
          }
          return true;
        });
      }
      return hotel;
    });

    // Keep only hotels that have at least one room
    const finalFiltered = filtered.filter(h => h.rooms && h.rooms.length > 0);
    setFilteredHotels(finalFiltered);
  }, [hotels, filters]);

  useEffect(() => {
    // On initial hotel load or filter changes, apply filter
    if (hotels && hotels.length > 0) {
      applyFilters();
    }
  }, [hotels, filters, applyFilters]);

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.starRating > 0) count++;
    if (filters.minPrice > 0) count++;
    if (filters.maxPrice < 1000) count++;
    count += filters.amenities.length;
    return count;
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      starRating: 0,
      minPrice: 0,
      maxPrice: 1000,
      amenities: [],
    });
    // After resetting, everything is shown
    setFilteredHotels(hotels);
  };

  /** -----------------------
   *  3. Room Selection, Expand/Collapse
   * -----------------------
   */
  const toggleHotelExpand = (hotelId: string) => {
    if (expandedHotelId === hotelId) {
      setExpandedHotelId(null);
    } else {
      const hotel = filteredHotels.find(h => h.id === hotelId);
      if (hotel && hotel.rooms && hotel.rooms.length > 0) {
        setExpandedHotelId(hotelId);
        setSelectedHotelId(hotelId);
      } else {
        // no rooms available
        setExpandedHotelId(null);
      }
    }
  };

  const handleSelectRoom = (hotelId: string, roomId: string) => {
    setSelectedHotelId(hotelId);
    setSelectedRoomId(roomId);
  };

  /** -----------------------
   *  4. Checkout Logic
   * -----------------------
   */
  const handleCheckout = () => {
    // Show card modal
    setShowCardModal(true);
  };

  const handleCardSubmit = async () => {
    try {
      // Validate card input
      if (!cardDetails.cardNumber || !cardDetails.pin || !cardDetails.expirationDate) {
        alert('Please fill in all card details');
        return;
      }
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to book');
        router.push('/login');
        return;
      }

      // 1) Validate Card
      const cardResponse = await fetch('http://localhost:80/api/auth/cardvalidation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cardDetails),
      });
      const cardData = await cardResponse.json();
      if (cardData.error) {
        alert(cardData.error);
        return;
      }

      // 2) Book Flights
      // flightIds is a comma-separated string from query
      let flightBookingResult: any = null;
      {
        const flightBookingRes = await fetch(
          `http://localhost:80/api/bookings/flightbooking?flightIds=${flightIds}`,
          {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        flightBookingResult = await flightBookingRes.json();
        if (flightBookingResult.error) {
          throw new Error(`Flight booking failed: ${flightBookingResult.error}`);
        }
      }

      // 3) Book Hotel if chosen
      let hotelBookingResult: any = null;
      if (selectedHotelId && selectedRoomId) {
        const chosenHotel = filteredHotels.find(h => h.id === selectedHotelId);
        const chosenRoom = chosenHotel?.rooms.find(r => r.id === selectedRoomId);
        if (!chosenHotel || !chosenRoom) {
          alert('Selected room not found');
          return;
        }

        // Typically roomNum is a number
        const roomNumInt = parseInt(chosenRoom.roomNum, 10) || 0;
        const bookingRequest = {
          hotelId: selectedHotelId,
          roomType: chosenRoom.name,
          roomNum: roomNumInt,
          checkIn: checkInDate,
          checkOut: checkOutDate,
        };

        const hotelBookingRes = await fetch('http://localhost:3000/api/hotels/addHotelBooking', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(bookingRequest),
        });
        hotelBookingResult = await hotelBookingRes.json();
        if (hotelBookingResult.error) {
          throw new Error(`Hotel booking failed: ${hotelBookingResult.error}`);
        }
      }

      // 4) Create Itinerary
      // If no hotel was selected, omit the hotel ref
      let itineraryUrl = `http://localhost:80/api/itineraries/create?flightBookingRef=${flightBookingResult.bookingReference}`;
      if (hotelBookingResult && hotelBookingResult.newBooking?.id) {
        itineraryUrl += `&hotelBookingRef=${hotelBookingResult.newBooking.id}`;
      }
      const itineraryRes = await fetch(itineraryUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const itineraryData = await itineraryRes.json();
      if (itineraryData.error) {
        throw new Error(`Itinerary creation failed: ${itineraryData.error}`);
      }

      // 5) Show final receipt in a single "bookingResult" object
      setBookingResult({
        flightBooking: flightBookingResult,
        hotelBooking: hotelBookingResult?.newBooking || null,
        itinerary: itineraryData.itinerary || null,
      });

      setShowCardModal(false);
    } catch (error) {
      console.error('Error during booking:', error);
      alert(error.message || 'An error occurred during booking.');
    }
  };

  // Calculate total price: sum flights + (hotel cost * nights if selected)
  const getTotalPrice = () => {
    let flightTotal = flights.reduce((sum, f) => sum + (f.price || 0), 0);
    let hotelTotal = 0;
    if (selectedHotelId && selectedRoomId) {
      // find the selected room
      const selectedH = filteredHotels.find(h => h.id === selectedHotelId);
      const selectedR = selectedH?.rooms.find(r => r.id === selectedRoomId);
      if (selectedR) {
        // calculate nights
        const inDate = new Date(checkInDate as string);
        const outDate = new Date(checkOutDate as string);
        const nights = Math.ceil((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));
        hotelTotal = selectedR.pricePerNight * nights;
      }
    }
    return flightTotal + hotelTotal;
  };

  /** -----------------------
   *  5. UI / Render
   * -----------------------
   */
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

  // star rating rendering helper
  const formatStarRating = (rating: number) => {
    return [...Array(5)].map((_, i) => {
      const starValue = i + 1;
      return (
        <FaStar
          key={i}
          className={starValue <= rating ? 'text-yellow-400 mr-1' : 'text-gray-300 mr-1'}
        />
      );
    });
  };

  // helper for unique room types (optional)
  const getUniqueRoomTypes = (hotel: Hotel): string[] => {
    if (!hotel.rooms || hotel.rooms.length === 0) return [];
    const setTypes = new Set<string>();
    hotel.rooms.forEach(r => setTypes.add(r.name));
    return Array.from(setTypes);
  };

  // fallback image
  const getHotelImageUrl = (hotel: Hotel): string => {
    if (hotel.pictures && hotel.pictures.length > 0) {
      return hotel.pictures[0];
    }
    if (hotel.images && Array.isArray(hotel.images) && hotel.images.length > 0) {
      const img = hotel.images[0];
      if (typeof img === 'string') return img;
      if (typeof img === 'object' && img.link) return img.link;
    }
    if (hotel.logo) return hotel.logo;
    return '/placeholder-hotel.jpg';
  };

  // active filter count
  const activeFilterCount = getActiveFilterCount();

  return (
    <>
      <Head>
        <title>Itinerary - FlyNext</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top navigation */}
          <div className="mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
              <FaPlane className="mr-2" />
              Back to Home
            </Link>
          </div>

          {/* Checkout Details Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Itinerary</h2>

            {/* Flight Details */}
            {flights && flights.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Flights</h3>
                <div className="space-y-4">
                  {flights.map((flight) => (
                    <div
                      key={flight.id}
                      className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{flight.airline.name} ({flight.flightNumber})</p>
                          <p className="text-sm text-gray-600">
                            {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} ({flight.destination.code})
                          </p>
                        </div>
                        <p className="text-blue-600 font-medium">${flight.price}</p>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <div>
                          <p>
                            Departure: {new Date(flight.departureTime).toLocaleString()}
                          </p>
                          <p>
                            Arrival: {new Date(flight.arrivalTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium text-lg pt-2 border-t mt-2">
                    <span>Total Flight Cost:</span>
                    <span>
                      $
                      {flights.reduce((sum, fl) => sum + (fl.price || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* If user selects a room, show quick summary here */}
            {selectedHotelId && selectedRoomId && (() => {
              const selectedH = filteredHotels.find(h => h.id === selectedHotelId);
              const selectedR = selectedH?.rooms.find(r => r.id === selectedRoomId);
              if (!selectedH || !selectedR) return null;

              // compute nights
              const checkIn = new Date(checkInDate as string);
              const checkOut = new Date(checkOutDate as string);
              const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
              const hotelCost = selectedR.pricePerNight * nights;

              return (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Selected Hotel</h3>
                  <div className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{selectedH.name}</p>
                        <p className="text-sm text-gray-600">{selectedH.location}</p>
                      </div>
                      <p className="text-blue-600 font-medium">${selectedR.pricePerNight}/night</p>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <div>
                        <p><FaCalendarAlt className="inline mr-1" /> Check-in: {checkIn.toLocaleDateString()}</p>
                        <p><FaCalendarAlt className="inline mr-1" /> Check-out: {checkOut.toLocaleDateString()}</p>
                        <p className="mt-1">Room: {selectedR.name} (#{selectedR.roomNum})</p>
                      </div>
                      <p className="text-right">Nights: {nights}</p>
                    </div>
                    <div className="flex justify-between font-medium text-lg pt-2 border-t mt-2">
                      <span>Total Hotel Cost:</span>
                      <span>${hotelCost}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Grand Total */}
            <div className="flex justify-between font-bold text-xl pt-4 border-t">
              <span>Total Price:</span>
              <span>${getTotalPrice()}</span>
            </div>
          </div>

          {/* Filters + Hotel List Section */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Filters sidebar */}
            <div className="w-full md:w-64 bg-white shadow-md rounded-lg p-6 h-fit">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold">Filters</h2>
                  {activeFilterCount > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Star Rating Filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Star Rating</h3>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <label key={rating} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="starRating"
                        checked={filters.starRating === rating}
                        onChange={() => setFilters({ ...filters, starRating: rating })}
                        className="mr-2"
                      />
                      <div className="flex items-center">
                        {[...Array(rating)].map((_, i) => <FaStar key={i} className="text-yellow-400 mr-1" />)}
                        <span className="ml-1 text-sm text-gray-700">& Up</span>
                      </div>
                    </label>
                  ))}
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="starRating"
                      checked={filters.starRating === 0}
                      onChange={() => setFilters({ ...filters, starRating: 0 })}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Any</span>
                  </label>
                </div>
              </div>

              {/* Price Range Filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Price Range</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-sm mr-2">$</span>
                    <input
                      type="number"
                      min="0"
                      value={filters.minPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, minPrice: Math.max(0, Number(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">$</span>
                    <input
                      type="number"
                      min={filters.minPrice}
                      value={filters.maxPrice}
                      onChange={(e) =>
                        setFilters({ ...filters, maxPrice: Math.max(filters.minPrice, Number(e.target.value) || 0) })
                      }
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                </div>
              </div>

              {/* Amenities Filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Amenities</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableAmenities.length > 0 ? (
                    availableAmenities.map((amenity) => (
                      <label key={amenity} className="flex items-center text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.amenities.includes(amenity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                amenities: [...prev.amenities, amenity],
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                amenities: prev.amenities.filter(a => a !== amenity),
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span>{amenity}</span>
                      </label>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm">
                      Loading amenities...
                    </div>
                  )}
                </div>
              </div>

              {/* Button to re-apply filters (though we auto-apply on changes) */}
              <button
                onClick={applyFilters}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Apply Filters
              </button>
            </div>

            {/* Hotel listings */}
            <div className="flex-1">
              {(!filteredHotels || filteredHotels.length === 0) ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                    No matching rooms found
                  </h2>
                  <p className="text-gray-600 mb-4">
                    {activeFilterCount > 0
                      ? 'No rooms match your current filters. Try adjusting your filters.'
                      : 'Please try different search criteria.'}
                  </p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={resetFilters}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Reset All Filters
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mb-4 text-gray-600">
                    Found {filteredHotels.length} hotel
                    {filteredHotels.length !== 1 ? 's' : ''} with matching rooms
                  </div>
                  <div className="space-y-6">
                    {filteredHotels.map((hotel) => (
                      <div
                        key={hotel.id}
                        className={`bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ${
                          selectedHotelId === hotel.id ? 'ring-2 ring-blue-600' : ''
                        }`}
                      >
                        <div className="p-6">
                          <div className="flex flex-col md:flex-row md:items-start">
                            {/* Hotel Image(s) */}
                            <div className="relative h-64 md:h-48 md:w-64 mb-4 md:mb-0 md:mr-6 overflow-x-auto whitespace-nowrap rounded-lg border">
                              {Array.isArray(hotel.images) && hotel.images.length > 0 ? (
                                hotel.images.map((img, index) => {
                                  const url = typeof img === 'string' ? img : img.link;
                                  return (
                                    <img
                                      key={index}
                                      src={url || '/placeholder-hotel.jpg'}
                                      alt={`Hotel ${hotel.name} image ${index + 1}`}
                                      className="inline-block h-full w-64 object-cover mr-2 rounded-lg"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).src =
                                          '/placeholder-hotel.jpg';
                                      }}
                                    />
                                  );
                                })
                              ) : (
                                <img
                                  src={getHotelImageUrl(hotel)}
                                  alt={`Hotel ${hotel.name}`}
                                  className="h-full w-64 object-cover rounded-lg"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src =
                                      '/placeholder-hotel.jpg';
                                  }}
                                />
                              )}
                            </div>

                            {/* Hotel Info */}
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900">
                                    {hotel.name}
                                  </h3>
                                  <div className="flex items-center mt-1">
                                    {formatStarRating(hotel.starRating)}
                                  </div>
                                </div>
                                <button
                                  onClick={() => toggleHotelExpand(hotel.id)}
                                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium"
                                >
                                  {expandedHotelId === hotel.id ? 'Hide Rooms' : 'View Rooms'}
                                </button>
                              </div>

                              <div className="flex items-center mb-2 text-gray-600">
                                <FaMapMarkerAlt className="mr-1" />
                                <span>{hotel.location}</span>
                              </div>

                              <p className="text-gray-600 mb-4">{hotel.address}</p>

                              {/* Amenities (limited to first 5) */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {hotel.amenities && hotel.amenities.length > 0 ? (
                                  <>
                                    {hotel.amenities.slice(0, 5).map((amenity, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                      >
                                        {amenity}
                                      </span>
                                    ))}
                                    {hotel.amenities.length > 5 && (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                        +{hotel.amenities.length - 5} more
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-500">No amenities listed</span>
                                )}
                              </div>

                              {/* Room Types */}
                              {getUniqueRoomTypes(hotel).length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-gray-700 mb-2">
                                    Room Types:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {getUniqueRoomTypes(hotel).map((roomType, index) => (
                                      <span
                                        key={index}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        <FaBed className="mr-1" />
                                        {roomType}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* "Starting from" Price */}
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Starting from</p>
                                <p className="text-2xl font-bold text-blue-600">
                                  {hotel.price
                                    ? `$${hotel.price}`
                                    : hotel.rooms && hotel.rooms.length > 0
                                    ? `$${Math.min(...hotel.rooms.map(r => r.pricePerNight))}`
                                    : 'Price on request'}
                                  /night
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Rooms Section if expanded */}
                          {expandedHotelId === hotel.id && (
                            <div className="mt-6 border-t border-gray-200 pt-6">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                Available Rooms
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {!hotel.rooms || hotel.rooms.length === 0 ? (
                                  <div className="col-span-2 text-center py-4">
                                    <p className="text-gray-500">
                                      No rooms match your current filters for this hotel.
                                    </p>
                                  </div>
                                ) : (
                                  hotel.rooms.map((room) => (
                                    <div
                                      key={room.id}
                                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                        selectedRoomId === room.id
                                          ? 'border-blue-600 bg-blue-50'
                                          : 'border-gray-200 hover:border-blue-300'
                                      }`}
                                      onClick={() => handleSelectRoom(hotel.id, room.id)}
                                    >
                                      <div className="flex justify-between mb-2">
                                        <h5 className="font-semibold">{room.name}</h5>
                                        <span className="font-bold text-blue-600">
                                          ${room.pricePerNight}/night
                                        </span>
                                      </div>

                                      {room.images && room.images.length > 0 && (
                                        <div className="flex overflow-x-auto space-x-2 mb-3">
                                          {room.images.map((img, i) => {
                                            const url = typeof img === 'string' ? img : img.link;
                                            return (
                                              <img
                                                key={i}
                                                src={url || '/placeholder-room.jpg'}
                                                alt={`Room ${room.name} image ${i + 1}`}
                                                className="w-40 h-28 object-cover rounded-md flex-shrink-0"
                                                onError={(e) => {
                                                  (e.currentTarget as HTMLImageElement).src =
                                                    '/placeholder-room.jpg';
                                                }}
                                              />
                                            );
                                          })}
                                        </div>
                                      )}

                                      <div className="flex items-center mb-2 text-gray-600">
                                        <FaBed className="mr-1" />
                                        <span>Room {room.roomNum}</span>
                                      </div>

                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {room.amenities && room.amenities.length > 0 ? (
                                          room.amenities.slice(0, 3).map((am, idx) => (
                                            <span
                                              key={idx}
                                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                            >
                                              {am}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-gray-500 text-sm">
                                            No amenities listed
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Checkout Button */}
          <div className="mt-8 text-right">
            <button
              onClick={handleCheckout}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Checkout
            </button>
          </div>
        </div>
      </div>

      {/* Card Payment Modal */}
      {showCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Enter Card Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Card Number</label>
                <input
                  type="text"
                  value={cardDetails.cardNumber}
                  onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="4111111111111111"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PIN</label>
                <input
                  type="password"
                  value={cardDetails.pin}
                  onChange={(e) => setCardDetails({ ...cardDetails, pin: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                <input
                  type="date"
                  value={cardDetails.expirationDate}
                  onChange={(e) => setCardDetails({ ...cardDetails, expirationDate: e.target.value })}
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

      {/* Booking Result / Receipt */}
      {bookingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-y-auto z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-16 relative">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white pb-4 z-10 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
            </div>

            {/* Booking Details */}
            <div className="space-y-4 mt-4">
              {/* Flight Booking Details */}
              {bookingResult.flightBooking && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Flight Booking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Booking Reference</p>
                      <p className="font-medium">
                        {bookingResult.flightBooking.bookingReference || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-green-600">
                        {bookingResult.flightBooking.status || 'Confirmed'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hotel Booking Details (if chosen) */}
              {bookingResult.hotelBooking && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Hotel Booking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Booking Reference</p>
                      <p className="font-medium">
                        {bookingResult.hotelBooking.id || 'N/A'}
                      </p>
                    </div>
                    {/* Additional hotel booking fields if needed */}
                  </div>
                </div>
              )}

              {/* Itinerary Info */}
              {bookingResult.itinerary && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Itinerary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Itinerary ID</p>
                      <p className="font-medium">
                        {bookingResult.itinerary.id || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="font-medium text-green-600">
                        {bookingResult.itinerary.status || 'Created'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Close / Return Button */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setBookingResult(null)}
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

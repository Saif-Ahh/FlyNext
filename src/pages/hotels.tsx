// @ts-nocheck
// pages/hotels.tsx
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Link from 'next/link';
import { FaHotel, FaStar, FaMapMarkerAlt, FaWifi, FaSwimmingPool, FaUtensils, FaDumbbell, FaSpa, FaBed, FaCalendarAlt, FaCreditCard, FaPlane } from 'react-icons/fa';

interface HotelRoom {
  id: string;
  name: string;
  roomNum: string; 
  amenities: string[];
  pricePerNight: number;
  available?: boolean;
  images: string[];
}

interface Hotel {
  id: string;
  name: string;
  location: string;
  address: string;
  starRating: number;
  pictures: string[];
  rooms: HotelRoom[];
  amenities: string[];
  price?: number;
  logo?: string;
  images?: string[] | { link: string }[];
}

interface FlightSuggestion {
  id: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  price: number;
  airline: string;
}

interface FlightDetailLeg {
  departureTime: string;
  arrivalTime: string;
  duration: number;
  origin: string;
  destination: string;
  airline: string;
  flightNumber: string;
  layover?: {
    duration: number;
    location: string;
  };
}

interface FlightDetailInfo {
  totalDuration: number;
  totalPrice: number;
  currency: string;
  legs: FlightDetailLeg[];
  flightIds: string[];
}

export default function HotelResults() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    starRating: 0,
    minPrice: 0,
    maxPrice: 1000,
    amenities: [] as string[]
  });
  const [availableAmenities, setAvailableAmenities] = useState<string[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<Hotel[]>([]);
  
  // Add flight suggestions state
  const [flightSuggestions, setFlightSuggestions] = useState<FlightSuggestion[]>([]);
  const [showFlightSuggestions, setShowFlightSuggestions] = useState(false);
  const [originCity, setOriginCity] = useState('');
  const [originCitySuggestions, setOriginCitySuggestions] = useState<{city: string; code?: string}[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  
  // Add card modal and booking result states
  const [showCardModal, setShowCardModal] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    pin: '',
    expirationDate: ''
  });

  // Add flight details modal state
  const [selectedFlightDetail, setSelectedFlightDetail] = useState<FlightDetailInfo | null>(null);
  const [isFlightDetailLoading, setIsFlightDetailLoading] = useState(false);
  const [showFlightDetailModal, setShowFlightDetailModal] = useState(false);

  useEffect(() => {
    if (!router.isReady) return;
    
    const { destination, checkInDate, checkOutDate } = router.query;
    
    console.log("Received parameters:", { destination, checkInDate, checkOutDate });
    
    if (!destination || !checkInDate || !checkOutDate) {
      console.log("Missing parameters, not fetching hotels");
      setIsLoading(false);
      return;
    }

    // Check if we're returning from flight search
    const storedHotelState = localStorage.getItem('hotelSearchReturn');
    let savedFilters;
    let savedSelectedHotelId;
    let savedSelectedRoomId;
    let savedExpandedHotelId;
    
    if (storedHotelState) {
      try {
        const parsedState = JSON.parse(storedHotelState);
        
        // Only restore state if the current search parameters match the stored ones
        const sameSearch = 
          parsedState.destination === destination &&
          parsedState.checkInDate === checkInDate &&
          parsedState.checkOutDate === checkOutDate;
          
        if (sameSearch) {
          savedFilters = parsedState.filters;
          savedSelectedHotelId = parsedState.hotelId;
          savedSelectedRoomId = parsedState.roomId;
          savedExpandedHotelId = parsedState.expandedHotelId;
          
          console.log("Restoring previous hotel state:", parsedState);
        }
        
        // Clear the stored state after using it (or if parameters don't match)
        localStorage.removeItem('hotelSearchReturn');
      } catch (error) {
        console.error('Error parsing stored hotel state:', error);
      }
    }

    // Fetch available amenities for this location
    const fetchAmenities = async () => {
      try {
        const response = await fetch(`/api/hotels/getAllAmenities?location=${encodeURIComponent(destination as string)}`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data.allAmenities)) {
            // Remove duplicates and ensure string type
            const uniqueAmenities = [...new Set(data.allAmenities)].map(String);
            setAvailableAmenities(uniqueAmenities);
          }
        }
      } catch (error) {
        console.error('Error fetching amenities:', error);
      }
    };

    fetchAmenities();

    const fetchHotels = async () => {
      try {
        const params = new URLSearchParams();
        params.append('city', destination as string);
        params.append('startDate', checkInDate as string);
        params.append('endDate', checkOutDate as string);
        params.append('starRating', '0');
        params.append('minPrice', '0');
        params.append('maxPrice', '1000');

        console.log('Fetching hotels from:', `/api/hotels/visitorsearch?${params.toString()}`);

        const response = await fetch(`/api/hotels/visitorsearch?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch hotels');
        }

        const data = await response.json();
        console.log('API response structure:', JSON.stringify(data, null, 2));
        
        if (Array.isArray(data.hotels)) {
          const hotelsWithDetails = await Promise.all(
            data.hotels.map(async (hotel: any) => {
              try {
                const details = await fetchHotelDetails(hotel.id);
                console.log('Hotel details from API:', JSON.stringify(details, null, 2));
                
                // Process rooms to ensure consistent format
                let processedRooms: HotelRoom[] = [];
                
                // Check if hotel has availableRooms (from getHotelsWithAvailability)
                if (hotel.availableRooms && Array.isArray(hotel.availableRooms)) {
                  processedRooms = hotel.availableRooms.map((room: any) => ({
                    id: room.id || `${hotel.id}-${room.roomNum}`,
                    name: room.name,
                    roomNum: String(room.roomNum),
                    pricePerNight: room.pricePerNight,
                    amenities: Array.isArray(room.amenities) 
                      ? room.amenities 
                      : typeof room.amenities === 'string' 
                        ? room.amenities.split(',').map((a: string) => a.trim())
                        : [],
                    images: Array.isArray(room.images) ? room.images : [],
                    available: true
                  }));
                } 
                // Check if hotel has rooms property
                else if (hotel.rooms && Array.isArray(hotel.rooms)) {
                  processedRooms = hotel.rooms.map((room: any) => ({
                    id: room.id || `${hotel.id}-${room.roomNum}`,
                    name: room.name,
                    roomNum: String(room.roomNum),
                    pricePerNight: room.pricePerNight,
                    amenities: Array.isArray(room.amenities) 
                      ? room.amenities 
                      : typeof room.amenities === 'string' 
                        ? room.amenities.split(',').map((a: string) => a.trim())
                        : [],
                    images: Array.isArray(room.images) ? room.images : [],
                    available: true
                  }));
                }
                
                // If no rooms found in either property, check details
                if (processedRooms.length === 0 && details && details.roomTypeData) {
                  // Convert roomTypeData to a format matching our rooms
                  processedRooms = Object.entries(details.roomTypeData).map(([roomType, data]: [string, any], index) => ({
                    id: `${hotel.id}-${index}`,
                    name: roomType,
                    roomNum: String(index + 1),
                    pricePerNight: data.startingPrice,
                    amenities: Array.isArray(data.possibleAmenities) ? data.possibleAmenities : [],
                    images: [],
                    available: true
                  }));
                }
                
                return {
                  ...hotel,
                  rooms: processedRooms,
                  amenities: details?.allAmenities || details?.amenities || hotel.amenities || [],
                  price: details?.lowestPrice || details?.price || 
                    (processedRooms.length > 0 ? Math.min(...processedRooms.map(room => room.pricePerNight)) : null)
                };
              } catch (error) {
                console.error(`Error fetching details for hotel ${hotel.id}:`, error);
                return hotel;
              }
            })
          );
          
          console.log('Processed hotels:', hotelsWithDetails);
          setHotels(hotelsWithDetails);
          
          // Apply saved state after hotels are loaded
          if (savedFilters) {
            setFilters(savedFilters);
            // We'll apply the filters in the next useEffect
          } else {
            setFilteredHotels(hotelsWithDetails);
          }
          
          if (savedSelectedHotelId) {
            setSelectedHotelId(savedSelectedHotelId);
            
            if (savedSelectedRoomId) {
              setSelectedRoomId(savedSelectedRoomId);
            }
            
            if (savedExpandedHotelId) {
              setExpandedHotelId(savedExpandedHotelId);
            }
          }
        } else {
          console.warn('Hotels data is not an array:', data.hotels);
          setHotels([]);
        }
      } catch (error) {
        setError('Failed to load hotels. Please try again later.');
        console.error('Error fetching hotels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, [router.isReady, router.query]);

  const fetchHotelDetails = async (hotelId: string) => {
    try {
      // First fetch basic hotel details
      const detailsResponse = await fetch(`/api/hotels/userViewHotel?hotelId=${hotelId}`);
      if (!detailsResponse.ok) {
        throw new Error('Failed to fetch hotel details');
      }
      const detailsData = await detailsResponse.json();
      
      // Then fetch price and amenities
      const priceAmenitiesResponse = await fetch(`/api/hotels/getPriceAmenities?hotelId=${hotelId}`);
      if (!priceAmenitiesResponse.ok) {
        throw new Error('Failed to fetch price and amenities');
      }
      const priceAmenitiesData = await priceAmenitiesResponse.json();
      
      return {
        ...detailsData,
        price: priceAmenitiesData.lowestPrice,
        amenities: priceAmenitiesData.allAmenities || [],
      };
    } catch (error) {
      console.error('Error fetching hotel details:', error);
      return null;
    }
  };

  const getHotelImageUrl = (hotel: Hotel): string => {
    if (hotel?.pictures && Array.isArray(hotel.pictures) && hotel.pictures.length > 0) {
      return hotel.pictures[0];
    }
    
    if (hotel?.images && Array.isArray(hotel.images) && hotel.images.length > 0) {
      const image = hotel.images[0];
      if (typeof image === 'string') {
        return image;
      } else if (typeof image === 'object' && image.link) {
        return image.link;
      }
    }
    
    if (hotel?.logo) {
      return hotel.logo;
    }
    
    return '/placeholder-hotel.jpg';
  };

  const toggleHotelExpand = (hotelId: string) => {
    if (expandedHotelId === hotelId) {
      setExpandedHotelId(null);
    } else {
      const hotel = filteredHotels.find(h => h.id === hotelId);
      
      // Check if hotel has rooms before expanding
      if (hotel && hotel.rooms && hotel.rooms.length > 0) {
        setExpandedHotelId(hotelId);
        setSelectedHotelId(hotelId);
        
        // Debug: log room structure for this hotel
        console.log(`Rooms for hotel ${hotelId}:`, hotel?.rooms);
      } else {
        // If no rooms are available with current filters, show a message
        console.log(`No matching rooms for hotel ${hotelId} with current filters`);
        // Could add a toast notification here to inform the user
      }
    }
  };

  const handleSelectRoom = (hotelId: string, roomId: string) => {
    setSelectedHotelId(hotelId);
    setSelectedRoomId(roomId);
    
    // Fetch flight suggestions when a room is selected
    const selectedHotel = filteredHotels.find(h => h.id === hotelId);
    if (selectedHotel) {
      // Show the flight suggestions section even if we don't have an origin yet
      setShowFlightSuggestions(true);
    }
  };

  const handleBookNow = () => {
    if (!selectedHotelId || !selectedRoomId) {
      alert('Please select a room to book');
      return;
    }

    // Show card modal instead of directly navigating
    setShowCardModal(true);
  };

  const handleAddHotelToCart = async () => {
    if (!selectedHotelId || !selectedRoomId) {
      alert('Please select a room to add to cart');
      return;
    }
  
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to book a room');
      router.push('/login');
      return;
    }
  
    try {
      const existingBookingRef = localStorage.getItem('hotelBookingReference');
      if (existingBookingRef) {
        alert('You already have a hotel in your cart. Please checkout first.');
        return;
      }
  
      const { checkInDate, checkOutDate } = router.query;
  
      const selectedHotel = filteredHotels.find(h => h.id === selectedHotelId);
      const selectedRoom = selectedHotel?.rooms.find(r => r.id === selectedRoomId || `${selectedHotelId}-${r.roomNum}` === selectedRoomId);
  
      if (!selectedHotel || !selectedRoom) {
        alert('Selected room not found');
        return;
      }
  
      const roomNumInt = Number(selectedRoom.roomNum);
      const requestData = {
        hotelId: selectedHotelId,
        roomType: selectedRoom.name,
        roomNum: roomNumInt,
        checkIn: checkInDate,
        checkOut: checkOutDate
      };
  
      const bookingResponse = await fetch(`/api/hotels/addHotelBooking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });
  
      const bookingData = await bookingResponse.json();
  
      if (bookingData.error) {
        console.error('Booking error:', bookingData.error);
        alert(`Booking error: ${bookingData.error}`);
        return;
      }
  
      const bookingReference =
        bookingData.newBooking?.id ||
        bookingData.bookingReference ||
        `HB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  
      // Store in localStorage
      localStorage.setItem('hotelBookingReference', bookingReference);
  
      const totalNights = Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24));
  
      const hotelCartItem = {
        type: 'hotel',
        hotelName: selectedHotel.name,
        checkInDate,
        checkOutDate,
        totalNights,
        hotelId: selectedHotel.id,
        bookingReference,
        room: {
          name: selectedRoom.name,
          roomNum: selectedRoom.roomNum,
          pricePerNight: selectedRoom.pricePerNight
        }
      };
      
  
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
      existingCart.push(hotelCartItem);
      localStorage.setItem('cart', JSON.stringify(existingCart));
  
      alert('Room booked and added to cart successfully!');
      router.push('/');
    } catch (error) {
      console.error('Error adding hotel to cart:', error);
      alert('Failed to add hotel to cart. Please try again.');
    }
  };
  
  // Function to fetch flight suggestions based on hotel location
  const fetchFlightSuggestions = async (destination: string) => {
    if (!originCity) {
      // If no origin city is set, we'll still show the section but without results
      setFlightSuggestions([]);
      return;
    }
    
    try {
      // Show loading state
      setIsLoading(true);
      
      // Format dates for API
      const checkInDate = router.query.checkInDate as string;
      
      // To ensure flight arrives on check-in date, we need to search for flights
      // departing one day before (for shorter flights) or even earlier for longer flights
      // Let's create a range of possible departure dates to find flights arriving on check-in
      
      // Parse check-in date
      const checkInDateObj = new Date(checkInDate);
      
      // Create a range of potential departure dates (1-3 days before check-in)
      const potentialDepartureDates = [];
      for (let i = 3; i >= 1; i--) {
        const departDate = new Date(checkInDateObj);
        departDate.setDate(departDate.getDate() - i);
        potentialDepartureDates.push(departDate.toISOString().split('T')[0]);
      }
      
      // We'll try each departure date to find flights arriving on check-in date
      let allFlightOptions: any[] = [];
      
      // Search for flights for each potential departure date
      for (const departureDate of potentialDepartureDates) {
        const response = await fetch(`/api/flights/one-way?source=${encodeURIComponent(originCity)}&destination=${encodeURIComponent(destination)}&departureDate=${encodeURIComponent(departureDate)}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch flights for departure date ${departureDate}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.error) {
          console.error('API returned error:', data.error);
          continue;
        }
        
        if (data.results && Array.isArray(data.results)) {
          // Filter flights that arrive on check-in date
          const matchingFlights = data.results.filter((itinerary: any) => {
            // Check if the last flight leg arrives on check-in date
            if (itinerary.flights && itinerary.flights.length > 0) {
              const lastFlight = itinerary.flights[itinerary.flights.length - 1];
              const arrivalDate = new Date(lastFlight.arrivalTime).toISOString().split('T')[0];
              return arrivalDate === checkInDate;
            }
            return false;
          });
          
          // Add matching flights to our options
          allFlightOptions = [...allFlightOptions, ...matchingFlights];
        }
      }
      
      // Process the API response
      const suggestions: FlightSuggestion[] = [];
      
      // Take up to 3 results
      const maxResults = Math.min(allFlightOptions.length, 3);
      
      for (let i = 0; i < maxResults; i++) {
        const itinerary = allFlightOptions[i];
        if (itinerary.flights && itinerary.flights.length > 0) {
          const firstFlight = itinerary.flights[0];
          const lastFlight = itinerary.flights[itinerary.flights.length - 1];
          
          suggestions.push({
            id: `flight-${i}`,
            itineraryIndex: i, // Store the index of this itinerary in our results
            origin: originCity,
            destination: destination,
            departureDate: new Date(firstFlight.departureTime).toISOString().split('T')[0],
            returnDate: router.query.checkOutDate as string,
            price: itinerary.flights.reduce((sum: number, flight: any) => sum + flight.price, 0),
            airline: firstFlight.airline.name || 'Unknown Airline',
            // Store the full itinerary data for direct access
            rawItinerary: itinerary
          });
        }
      }
      
      setFlightSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching flight suggestions:', error);
      setFlightSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Function to search for city suggestions
  const searchCities = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setOriginCitySuggestions([]);
      return;
    }
    
    try {
      setIsSearchingCities(true);
      const response = await fetch(`/api/flights/autoComplete?keyword=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch city suggestions');
      }
      
      const data = await response.json();
      
      // Combine cities and airports into a single list
      const suggestions: {city: string; code?: string}[] = [];
      
      // Add matching cities
      if (data.cities && Array.isArray(data.cities)) {
        data.cities.forEach((city: string) => {
          suggestions.push({ city });
        });
      }
      
      // Add matching airports by name
      if (data.airportsByName && Array.isArray(data.airportsByName)) {
        data.airportsByName.forEach((airport: { code: string; name: string }) => {
          suggestions.push({ city: airport.name, code: airport.code });
        });
      }
      
      // Add matching airports by code
      if (data.airportsByCode && Array.isArray(data.airportsByCode)) {
        data.airportsByCode.forEach((airport: { code: string; name: string }) => {
          // Only add if not already in the list
          if (!suggestions.some(s => s.code === airport.code)) {
            suggestions.push({ city: airport.name, code: airport.code });
          }
        });
      }
      
      setOriginCitySuggestions(suggestions.slice(0, 5)); // Limit to 5 suggestions
    } catch (error) {
      console.error('Error searching cities:', error);
      setOriginCitySuggestions([]);
    } finally {
      setIsSearchingCities(false);
    }
  };
  
  // Handle origin city selection
  const handleSelectOriginCity = (selected: {city: string; code?: string}) => {
    const cityText = selected.code ? `${selected.city} (${selected.code})` : selected.city;
    setOriginCity(cityText);
    setOriginCitySuggestions([]); 
    
    // If we have a selected hotel, fetch flight suggestions
    if (selectedHotelId) {
      const selectedHotel = filteredHotels.find(h => h.id === selectedHotelId);
      if (selectedHotel) {
        fetchFlightSuggestions(selectedHotel.location);
      }
    }
  };
  
  // Function to create a link to flight search with pre-filled data
  const createFlightSearchLink = (suggestion: FlightSuggestion) => {
    // Encode the current hotel selection for storage
    const hotelSelectionData = {
      hotelId: selectedHotelId,
      roomId: selectedRoomId,
      checkInDate: router.query.checkInDate,
      checkOutDate: router.query.checkOutDate
    };
    
    // Store the hotel selection in localStorage to preserve it
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingHotelSelection', JSON.stringify(hotelSelectionData));
    }
    
    // Create link to flight search with pre-filled data
    return `/flights?origin=${encodeURIComponent(suggestion.origin)}&destination=${encodeURIComponent(suggestion.destination)}&departureDate=${encodeURIComponent(suggestion.departureDate)}&returnDate=${encodeURIComponent(suggestion.returnDate)}&pendingHotel=true`;
  };

  const formatStarRating = (rating: number) => {
    return [...Array(5)].map((_, i) => {
      const starValue = i + 1;
      const isHalfStar = rating >= i && rating < starValue;
      const isFullStar = rating >= starValue;
      
      return (
        <div key={i} className="relative inline-block">
          {isHalfStar ? (
            <div className="relative">
              <FaStar className="text-gray-300 mr-1" />
              <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                <FaStar className="text-yellow-400 mr-1" />
              </div>
            </div>
          ) : isFullStar ? (
            <FaStar className="text-yellow-400 mr-1" />
          ) : (
            <FaStar className="text-gray-300 mr-1" />
          )}
        </div>
      );
    });
  };

  const applyFilters = useCallback(() => {
    if (!hotels || hotels.length === 0) {
      setFilteredHotels([]);
      return;
    }

    // First, create a deep copy of the hotels to avoid mutating the original data
    const hotelsCopy = JSON.parse(JSON.stringify(hotels)) as Hotel[];
    
    // For each hotel, filter its rooms based on price and amenities
    const filtered = hotelsCopy.map(hotel => {
      // Skip star rating filter for rooms (star rating is a hotel property)
      if (filters.starRating > 0 && hotel.starRating < filters.starRating) {
        // This hotel doesn't meet star rating requirement - return with empty rooms
        hotel.rooms = [];
        return hotel;
      }
      
      // Filter rooms by price
      if (hotel.rooms && Array.isArray(hotel.rooms)) {
        hotel.rooms = hotel.rooms.filter(room => {
          // Price filter
          if (room.pricePerNight < filters.minPrice || room.pricePerNight > filters.maxPrice) {
            return false;
          }
          
          // Amenities filter for rooms
          if (filters.amenities.length > 0) {
            // Check if the room has all the selected amenities
            if (!room.amenities || !Array.isArray(room.amenities)) {
              return false;
            }
            return filters.amenities.every(amenity => 
              room.amenities.includes(amenity)
            );
          }
          
          return true;
        });
      }
      
      return hotel;
    });
    
    // Only keep hotels that have at least one room after filtering
    const hotelsWithAvailableRooms = filtered.filter(hotel => 
      hotel.rooms && hotel.rooms.length > 0
    );
    
    setFilteredHotels(hotelsWithAvailableRooms);
  }, [hotels, filters]);

  useEffect(() => {
    if (hotels && hotels.length > 0) {
      setFilteredHotels(hotels);
    }
  }, [hotels]);

  // Add count of active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0;
    if (filters.starRating > 0) count++;
    if (filters.minPrice > 0) count++;
    if (filters.maxPrice < 1000) count++;
    count += filters.amenities.length;
    return count;
  }, [filters]);

  // Add a function to reset filters
  const resetFilters = () => {
    setFilters({
      starRating: 0,
      minPrice: 0,
      maxPrice: 1000,
      amenities: []
    });
    // Reset to all hotels
    setFilteredHotels(hotels);
  };

  // Add an effect to close expanded hotels when filters change and the hotel has no matching rooms
  useEffect(() => {
    if (expandedHotelId) {
      const expandedHotel = filteredHotels.find(hotel => hotel.id === expandedHotelId);
      if (!expandedHotel || !expandedHotel.rooms || expandedHotel.rooms.length === 0) {
        // If the expanded hotel no longer has rooms after filtering, close it
        setExpandedHotelId(null);
      }
    }
  }, [filteredHotels, expandedHotelId]);

  // After fetchHotelDetails function, add a function to extract room types
  const getUniqueRoomTypes = (hotel: Hotel): string[] => {
    if (!hotel.rooms || !Array.isArray(hotel.rooms) || hotel.rooms.length === 0) {
      return [];
    }
    
    // Extract unique room types from the rooms array
    const roomTypeSet = new Set<string>();
    hotel.rooms.forEach(room => {
      if (room.name) {
        roomTypeSet.add(room.name);
      }
    });
    
    return Array.from(roomTypeSet);
  };

  // Function to fetch flight details
  const fetchFlightDetails = async (suggestion: FlightSuggestion) => {
    try {
      setIsFlightDetailLoading(true);
      
      // If we have the raw itinerary already stored in the suggestion, use that
      if (suggestion.rawItinerary) {
        const itinerary = suggestion.rawItinerary;
        
        // Create a flight detail object from the itinerary
        const flightDetail: FlightDetailInfo = {
          totalDuration: itinerary.flights.reduce((sum: number, flight: any) => sum + flight.duration, 0),
          totalPrice: itinerary.flights.reduce((sum: number, flight: any) => sum + flight.price, 0),
          currency: itinerary.flights[0]?.currency || 'USD',
          legs: itinerary.flights.map((flight: any, index: number) => {
            const leg: FlightDetailLeg = {
              departureTime: flight.departureTime,
              arrivalTime: flight.arrivalTime,
              duration: flight.duration,
              origin: `${flight.origin.city} (${flight.origin.code})`,
              destination: `${flight.destination.city} (${flight.destination.code})`,
              airline: flight.airline.name,
              flightNumber: flight.flightNumber,
            };
            
            // Add layover information if there's another flight after this one
            if (index < itinerary.flights.length - 1) {
              const nextFlight = itinerary.flights[index + 1];
              const layoverDuration = 
                (new Date(nextFlight.departureTime).getTime() - new Date(flight.arrivalTime).getTime()) / 
                (1000 * 60); // Convert to minutes
                
              leg.layover = {
                duration: layoverDuration,
                location: `${flight.destination.city} (${flight.destination.code})`,
              };
            }
            
            return leg;
          }),
          flightIds: itinerary.flights.map((flight: any) => flight.id),
        };
        
        return flightDetail;
      }
      
      // If we don't have the raw itinerary, fetch it from the API
      // (this is a fallback and shouldn't normally be needed)
      const response = await fetch(`/api/flights/one-way?source=${encodeURIComponent(suggestion.origin)}&destination=${encodeURIComponent(suggestion.destination)}&departureDate=${encodeURIComponent(suggestion.departureDate)}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch flight details');
      }
      
      const data = await response.json();
      
      if (data.error) {
        console.error('API returned error:', data.error);
        return null;
      }
      
      // Get the flight at the specified index if available
      const resultIndex = suggestion.itineraryIndex || 0;
      if (data.results && data.results.length > resultIndex) {
        const itinerary = data.results[resultIndex];
        
        // Create a flight detail object from the itinerary
        const flightDetail: FlightDetailInfo = {
          totalDuration: itinerary.flights.reduce((sum: number, flight: any) => sum + flight.duration, 0),
          totalPrice: itinerary.flights.reduce((sum: number, flight: any) => sum + flight.price, 0),
          currency: itinerary.flights[0]?.currency || 'USD',
          legs: itinerary.flights.map((flight: any, index: number) => {
            const leg: FlightDetailLeg = {
              departureTime: flight.departureTime,
              arrivalTime: flight.arrivalTime,
              duration: flight.duration,
              origin: `${flight.origin.city} (${flight.origin.code})`,
              destination: `${flight.destination.city} (${flight.destination.code})`,
              airline: flight.airline.name,
              flightNumber: flight.flightNumber,
            };
            
            // Add layover information if there's another flight after this one
            if (index < itinerary.flights.length - 1) {
              const nextFlight = itinerary.flights[index + 1];
              const layoverDuration = 
                (new Date(nextFlight.departureTime).getTime() - new Date(flight.arrivalTime).getTime()) / 
                (1000 * 60); // Convert to minutes
                
              leg.layover = {
                duration: layoverDuration,
                location: `${flight.destination.city} (${flight.destination.code})`,
              };
            }
            
            return leg;
          }),
          flightIds: itinerary.flights.map((flight: any) => flight.id),
        };
        
        return flightDetail;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching flight details:', error);
      return null;
    } finally {
      setIsFlightDetailLoading(false);
    }
  };
  
  // Handle view flight details click
  const handleViewFlightDetails = async (suggestion: FlightSuggestion) => {
    // Fetch the flight details
    const details = await fetchFlightDetails(suggestion);
    
    if (details) {
      // Set the flight details and show the modal
      setSelectedFlightDetail(details);
      setShowFlightDetailModal(true);
    } else {
      // If we couldn't get details, just use the original link behavior
      if (typeof window !== 'undefined') {
        // Store the hotel selection in localStorage
        localStorage.setItem('pendingHotelSelection', JSON.stringify({
          hotelId: selectedHotelId,
          roomId: selectedRoomId,
          checkInDate: router.query.checkInDate,
          checkOutDate: router.query.checkOutDate
        }));
        
        // Navigate to the flight search page
        router.push(createFlightSearchLink(suggestion));
      }
    }
  };
  
  // Handle booking flight from the flight details modal
  const handleBookFlight = async () => {
    if (!selectedFlightDetail) return;
    
    try {
      // Check if there's already a booking reference in localStorage
      const existingBookingRef = localStorage.getItem('flightBookingReference');
      if (existingBookingRef) {
        alert('You already have a flight in your cart. Please checkout first.');
        return;
      }

      // Must be logged in
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to book a flight');
        router.push('/login');
        return;
      }

      // Get the flight IDs
      const flightIds = selectedFlightDetail.flightIds.join(',');

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

      // Generate or extract the booking reference from the response
      const bookingReference =
        bookingData.newBooking?.id ||
        bookingData.bookingReference ||
        `FB-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Save booking reference to localStorage
      localStorage.setItem('flightBookingReference', bookingReference);

      // Extract relevant data for cart item
      const firstLeg = selectedFlightDetail.legs[0];
      const lastLeg = selectedFlightDetail.legs[selectedFlightDetail.legs.length - 1];
      
      // Extract destination city from the last leg's destination
      const destinationCity = lastLeg.destination.split('(')[0].trim();
      
      // Get arrival time (we'll use current date as we don't have the exact date)
      const checkInDate = router.query.checkInDate;
      const checkOutDate = router.query.checkOutDate;

      // Build a cart item
      const cartItem = {
        type: 'one-way',
        destinationCity,
        checkInDate,
        checkOutDate,
        flightIds,
        legs: selectedFlightDetail.legs,
        totalPrice: selectedFlightDetail.totalPrice,
        bookingReference,
      };

      // Add to cart in localStorage
      const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
      existingCart.push(cartItem);
      localStorage.setItem('cart', JSON.stringify(existingCart));

      // Close the modal
      setShowFlightDetailModal(false);

      // Notify user
      alert('Flight booked and added to cart successfully!');
      
      // Go to the home page
      router.push('/');
    } catch (error) {
      console.error('Error booking flight:', error);
      alert('Failed to book flight. Please try again.');
    }
  };
  
  // Format duration from minutes to hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  // Add an effect to apply saved filters after hotels are loaded
  useEffect(() => {
    if (hotels.length > 0 && filters) {
      // Apply filters to the loaded hotels
      applyFilters();
    }
  }, [hotels, filters, applyFilters]);

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
        <title>Hotel Search Results - FlyNext</title>
        <meta name="description" content="Search and book hotels" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
              <FaHotel className="mr-2" />
              Back to Search
            </Link>
          </div>

          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Available Hotels</h1>
            <button
              onClick={handleAddHotelToCart}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
              disabled={!selectedRoomId}
            >
              Add to Cart
            </button>
          </div>

          {/* Flight suggestions section */}
          {showFlightSuggestions && selectedRoomId && (
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-blue-800 flex items-center">
                  <FaPlane className="mr-2" />
                  Flight Suggestions to Complement Your Stay
                </h2>
                <button 
                  onClick={() => setShowFlightSuggestions(false)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Hide Suggestions
                </button>
              </div>

              {/* Origin city selector */}
              <div className="mb-4 relative">
                <label htmlFor="originCity" className="block text-sm font-medium text-gray-700 mb-1">
                  Where are you flying from?
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="originCity"
                    value={originCity}
                    onChange={(e) => {
                      setOriginCity(e.target.value);
                      searchCities(e.target.value);
                    }}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter city or airport"
                  />
                  {isSearchingCities && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                  )}
                  {originCitySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-300 max-h-60 overflow-auto">
                      {originCitySuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer"
                          onClick={() => handleSelectOriginCity(suggestion)}
                        >
                          {suggestion.code ? `${suggestion.city} (${suggestion.code})` : suggestion.city}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={() => {
                      if (selectedHotelId) {
                        const selectedHotel = filteredHotels.find(h => h.id === selectedHotelId);
                        if (selectedHotel) {
                          fetchFlightSuggestions(selectedHotel.location);
                        }
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    disabled={!originCity}
                  >
                    Search Flights
                  </button>
                </div>
              </div>
              
              {originCity ? (
                flightSuggestions.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {flightSuggestions.map(suggestion => (
                      <div key={suggestion.id} className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{suggestion.origin} to {suggestion.destination}</h3>
                            <p className="text-sm text-gray-600">{suggestion.airline}</p>
                          </div>
                          <span className="font-bold text-blue-600">${suggestion.price}</span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <p>Departure: {suggestion.rawItinerary?.flights[0]?.departureTime ? new Date(suggestion.rawItinerary.flights[0].departureTime).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        
                        <button 
                          onClick={() => handleViewFlightDetails(suggestion)}
                          className="block w-full text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                        >
                          {isFlightDetailLoading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </span>
                          ) : "View Flight Details"}
                        </button>
                      </div>
                    ))}
                    
                    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Need a different flight?</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Search for all available flights to match your hotel stay.
                        </p>
                      </div>
                      
                      <Link 
                        href="/"
                        className="block w-full text-center bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 transition-colors"
                        onClick={() => {
                          // Store the hotel selection in localStorage
                          if (typeof window !== 'undefined') {
                            // Store hotel selection
                            localStorage.setItem('pendingHotelSelection', JSON.stringify({
                              hotelId: selectedHotelId,
                              roomId: selectedRoomId,
                              checkInDate: router.query.checkInDate,
                              checkOutDate: router.query.checkOutDate
                            }));
                            
                            // Store flight search parameters for pre-filling on landing page
                            localStorage.setItem('flightSearchParams', JSON.stringify({
                              origin: originCity,
                              destination: filteredHotels.find(h => h.id === selectedHotelId)?.location || '',
                              departureDate: router.query.checkInDate,
                              returnDate: router.query.checkOutDate,
                              activeTab: 'flight', // Set active tab to flight search
                              pendingHotel: true
                            }));
                            
                            // Store hotel search parameters to enable "Go Back to Hotels" button
                            localStorage.setItem('hotelSearchReturn', JSON.stringify({
                              destination: router.query.destination,
                              checkInDate: router.query.checkInDate,
                              checkOutDate: router.query.checkOutDate,
                              hotelId: selectedHotelId,
                              roomId: selectedRoomId,
                              expandedHotelId: expandedHotelId,
                              filters: filters, // Store all filter settings
                              showBackButton: true,
                              fromFlightSuggestions: true
                            }));
                          }
                        }}
                      >
                        Search All Flights
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-lg text-center">
                    <p className="text-gray-600 mb-4">No flights found from {originCity} to this destination.</p>
                    <p className="text-sm text-gray-500">Try searching with a different origin city.</p>
                  </div>
                )
              ) : (
                <div className="bg-white p-6 rounded-lg text-center">
                  <p className="text-gray-600 mb-2">Enter your departure city above to see matching flights.</p>
                  <p className="text-sm text-gray-500">We'll find the best options to match your hotel stay dates.</p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8">
            {/* Filters sidebar */}
            <div className="w-full md:w-64 bg-white shadow-md rounded-lg p-6 h-fit">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center">
                  <h2 className="text-xl font-semibold">Filters</h2>
                  {getActiveFilterCount() > 0 && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      {getActiveFilterCount()}
                    </span>
                  )}
                </div>
                {getActiveFilterCount() > 0 && (
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
                    <label key={rating} className="flex items-center">
                      <input
                        type="radio"
                        name="starRating"
                        checked={filters.starRating === rating}
                        onChange={() => setFilters(prev => ({ ...prev, starRating: rating }))}
                        className="mr-2"
                      />
                      <div className="flex items-center">
                        {formatStarRating(rating)}
                        <span className="ml-1">& Up</span>
                      </div>
                    </label>
                  ))}
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="starRating"
                      checked={filters.starRating === 0}
                      onChange={() => setFilters(prev => ({ ...prev, starRating: 0 }))}
                      className="mr-2"
                    />
                    <span>Any</span>
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
                      onChange={(e) => setFilters(prev => ({ ...prev, minPrice: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full px-2 py-1 border rounded"
                    />
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm mr-2">$</span>
                    <input
                      type="number"
                      min={filters.minPrice}
                      value={filters.maxPrice}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Math.max(filters.minPrice, parseInt(e.target.value) || 0) }))}
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
                      <label key={amenity} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={filters.amenities.includes(amenity)}
                          onChange={(e) => {
                            setFilters(prev => ({
                              ...prev,
                              amenities: e.target.checked
                                ? [...prev.amenities, amenity]
                                : prev.amenities.filter(a => a !== amenity)
                            }));
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
              
              {/* Apply Filters Button */}
              <button
                onClick={applyFilters}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Apply Filters {getActiveFilterCount() > 0 && '(Show Matching Rooms)'}
              </button>
            </div>
            
            {/* Hotel listings */}
            <div className="flex-1">
              {!filteredHotels || filteredHotels.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-md">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">No matching rooms found</h2>
                  <p className="text-gray-600 mb-4">
                    {getActiveFilterCount() > 0 
                      ? "No rooms match your current filters. Try adjusting your filters to see more options."
                      : "Please try different search criteria."}
                  </p>
                  {getActiveFilterCount() > 0 && (
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
                    Found {filteredHotels.length} hotel{filteredHotels.length !== 1 ? 's' : ''} with matching rooms
                    {filteredHotels.length !== hotels.length && (
                      <span> (filtered from {hotels.length})</span>
                    )}
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
                          <div className="relative h-64 md:h-48 md:w-64 mb-4 md:mb-0 md:mr-6 overflow-x-auto whitespace-nowrap rounded-lg border">
                            {(Array.isArray(hotel.images) ? hotel.images : []).map((img, index) => {
                              const url = typeof img === 'string' ? img : img?.link;
                              return (
                                <img
                                  key={index}
                                  src={url || '/placeholder-hotel.jpg'}
                                  alt={`Hotel ${hotel.name} image ${index + 1}`}
                                  className="inline-block h-full w-64 object-cover mr-2 rounded-lg"
                                  onError={(e) => {
                                    console.error(`Error loading image for hotel ${hotel.name}`);
                                    (e.target as HTMLImageElement).src = '/placeholder-hotel.jpg';
                                  }}
                                />
                              );
                            })}
                          </div>


                            
                            <div className="flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="text-xl font-semibold text-gray-900">{hotel.name}</h3>
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
                              
                              <div className="flex flex-wrap gap-2 mb-4">
                                {hotel.amenities && hotel.amenities.length > 0 ? (
                                  <>
                                    {hotel.amenities.slice(0, 5).map((amenity, index) => (
                                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {amenity === 'WiFi' && <FaWifi className="mr-1" />}
                                        {amenity === 'Pool' && <FaSwimmingPool className="mr-1" />}
                                        {amenity === 'Restaurant' && <FaUtensils className="mr-1" />}
                                        {amenity === 'Gym' && <FaDumbbell className="mr-1" />}
                                        {amenity === 'Spa' && <FaSpa className="mr-1" />}
                                        {amenity}
                                      </span>
                                    ))}
                                    {hotel.amenities.length > 5 && (
                                      <div className="relative inline-block">
                                        <span 
                                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 transition-colors relative"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            
                                            // Create separate arrays for visible and hidden amenities
                                            const visibleAmenities = hotel.amenities.slice(0, 5);
                                            const hiddenAmenities = hotel.amenities.slice(5);
                                            
                                            console.log('Visible hotel amenities:', visibleAmenities);
                                            console.log('Hidden hotel amenities:', hiddenAmenities);
                                            
                                            // Create popup element
                                            const popup = document.createElement('div');
                                            popup.className = 'absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50';
                                            popup.style.minWidth = '220px';
                                            
                                            // Add header
                                            const header = document.createElement('div');
                                            header.className = 'font-medium text-sm text-gray-700 border-b pb-2 mb-2';
                                            header.textContent = `Hidden Amenities (${hiddenAmenities.length})`;
                                            popup.appendChild(header);
                                            
                                            // Add only the hidden amenities to the popup
                                            if (hiddenAmenities.length > 0) {
                                              const amenitiesList = document.createElement('div');
                                              amenitiesList.className = 'space-y-1.5';
                                              
                                              hiddenAmenities.forEach(amenity => {
                                                const item = document.createElement('div');
                                                item.className = 'whitespace-nowrap py-1 text-xs flex items-center';
                                                item.innerHTML = `<span class="mr-1.5 text-blue-600">•</span> ${amenity}`;
                                                amenitiesList.appendChild(item);
                                              });
                                              
                                              popup.appendChild(amenitiesList);
                                            } else {
                                              const noItems = document.createElement('div');
                                              noItems.className = 'text-gray-500 text-xs italic';
                                              noItems.textContent = 'No additional amenities';
                                              popup.appendChild(noItems);
                                            }
                                            
                                            // Find existing popups and remove them
                                            const existingPopups = document.querySelectorAll('.amenities-popup');
                                            existingPopups.forEach(p => p.remove());
                                            
                                            // Add this class for later reference
                                            popup.classList.add('amenities-popup');
                                            
                                            // Add to document
                                            e.currentTarget.appendChild(popup);
                                            
                                            // Close when clicking outside
                                            const handleClickOutside = (event) => {
                                              if (!popup.contains(event.target) && event.target !== e.currentTarget) {
                                                popup.remove();
                                                document.removeEventListener('click', handleClickOutside);
                                              }
                                            };
                                            
                                            // Add event listener with slight delay to prevent immediate closing
                                            setTimeout(() => {
                                              document.addEventListener('click', handleClickOutside);
                                            }, 100);
                                          }}
                                        >
                                          +{hotel.amenities.length - 5} more
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-500">No amenities listed</span>
                                )}
                              </div>
                              
                              {/* Room Types Section */}
                              {getUniqueRoomTypes(hotel).length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium text-gray-700 mb-2">Room Types:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {getUniqueRoomTypes(hotel).map((roomType, index) => (
                                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        <FaBed className="mr-1" />
                                        {roomType}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              <div className="text-right">
                                <p className="text-sm text-gray-600">Starting from</p>
                                <p className="text-2xl font-bold text-blue-600">
                                  {hotel.price ? `$${hotel.price}` : 
                                   (hotel.rooms && hotel.rooms.length > 0) ? 
                                   `$${Math.min(...hotel.rooms.map(room => room.pricePerNight))}` : 
                                   'Price on request'}/night
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Room selection section */}
                          {expandedHotelId === hotel.id && (
                            <div className="mt-6 border-t border-gray-200 pt-6">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Rooms</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {!hotel.rooms || !Array.isArray(hotel.rooms) || hotel.rooms.length === 0 ? (
                                  <div className="col-span-2 text-center py-4">
                                    <p className="text-gray-500">
                                      {getActiveFilterCount() > 0 
                                        ? "No rooms match your current filters for this hotel." 
                                        : "No available rooms found."}
                                    </p>
                                  </div>
                                ) : (
                                  hotel.rooms.map(room => (
                                    <div 
                                      key={room.id || `${hotel.id}-${room.roomNum}`}
                                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                        selectedRoomId === room.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                                      }`}
                                      onClick={() => handleSelectRoom(hotel.id, room.id || `${hotel.id}-${room.roomNum}`)}
                                    >
                                      <div className="flex justify-between mb-2">
                                        <h5 className="font-semibold">{room.name}</h5>
                                        <span className="font-bold text-blue-600">${room.pricePerNight}/night</span>
                                      </div>

                                      {Array.isArray(room.images) && room.images.length > 0 && (
                                        <div className="flex overflow-x-auto space-x-2 mb-3">
                                          {room.images.map((img, index) => {
                                            const url = typeof img === 'string' ? img : img?.link;
                                            return (
                                              <img
                                                key={index}
                                                src={url || '/placeholder-room.jpg'}
                                                alt={`Room ${room.name} image ${index + 1}`}
                                                className="w-40 h-28 object-cover rounded-md flex-shrink-0"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).src = '/placeholder-room.jpg';
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
                                        {room.amenities && Array.isArray(room.amenities) && room.amenities.length > 0 ? (
                                          <>
                                            {room.amenities.slice(0, 3).map((amenity, index) => (
                                              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {amenity}
                                              </span>
                                            ))}
                                            {room.amenities.length > 3 && (
                                              <div className="relative inline-block">
                                                <span 
                                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 transition-colors relative"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    
                                                    // Create separate arrays for visible and hidden amenities
                                                    const visibleAmenities = room.amenities.slice(0, 3);
                                                    const hiddenAmenities = room.amenities.slice(3);
                                                    
                                                    console.log('Visible room amenities:', visibleAmenities);
                                                    console.log('Hidden room amenities:', hiddenAmenities);
                                                    
                                                    // Create popup element
                                                    const popup = document.createElement('div');
                                                    popup.className = 'absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50';
                                                    popup.style.minWidth = '220px';
                                                    
                                                    // Add header
                                                    const header = document.createElement('div');
                                                    header.className = 'font-medium text-sm text-gray-700 border-b pb-2 mb-2';
                                                    header.textContent = `Hidden Room Amenities (${hiddenAmenities.length})`;
                                                    popup.appendChild(header);
                                                    
                                                    // Add only the hidden amenities to the popup
                                                    if (hiddenAmenities.length > 0) {
                                                      const amenitiesList = document.createElement('div');
                                                      amenitiesList.className = 'space-y-1.5';
                                                      
                                                      hiddenAmenities.forEach(amenity => {
                                                        const item = document.createElement('div');
                                                        item.className = 'whitespace-nowrap py-1 text-xs flex items-center';
                                                        item.innerHTML = `<span class="mr-1.5 text-blue-600">•</span> ${amenity}`;
                                                        amenitiesList.appendChild(item);
                                                      });
                                                      
                                                      popup.appendChild(amenitiesList);
                                                    } else {
                                                      const noItems = document.createElement('div');
                                                      noItems.className = 'text-gray-500 text-xs italic';
                                                      noItems.textContent = 'No additional amenities';
                                                      popup.appendChild(noItems);
                                                    }
                                                    
                                                    // Find existing popups and remove them
                                                    const existingPopups = document.querySelectorAll('.amenities-popup');
                                                    existingPopups.forEach(p => p.remove());
                                                    
                                                    // Add this class for later reference
                                                    popup.classList.add('amenities-popup');
                                                    
                                                    // Add to document
                                                    e.currentTarget.appendChild(popup);
                                                    
                                                    // Close when clicking outside
                                                    const handleClickOutside = (event) => {
                                                      if (!popup.contains(event.target) && event.target !== e.currentTarget) {
                                                        popup.remove();
                                                        document.removeEventListener('click', handleClickOutside);
                                                      }
                                                    };
                                                    
                                                    // Add event listener with slight delay to prevent immediate closing
                                                    setTimeout(() => {
                                                      document.addEventListener('click', handleClickOutside);
                                                    }, 100);
                                                  }}
                                                >
                                                  +{room.amenities.length - 3} more
                                                </span>
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <span className="text-gray-500">No amenities listed</span>
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
        </div>
      </div>

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
                  placeholder="xxxx xxxx xxxx xxxx"
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

      {bookingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 overflow-y-auto z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-16 relative">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white pb-4 z-10 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Booking Confirmed!</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className="font-medium text-green-600">{bookingResult.status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Reference</p>
                    <p className="font-medium">{bookingResult.bookingReference || 'N/A'}</p>
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
              {/* Hotel Details Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hotel Details</h3>
                <div className="space-y-4">
                  <div className="border-b border-gray-200 pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{bookingResult.hotelDetails?.name || 'N/A'}</p>
                        <p className="text-sm text-gray-600">
                          {bookingResult.hotelDetails?.location || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {bookingResult.hotelDetails?.address || 'N/A'}
                        </p>
                        <div className="flex items-center mt-1">
                          {formatStarRating(bookingResult.hotelDetails?.starRating || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Room Details */}
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">
                          {bookingResult.hotelDetails?.room?.name || 'N/A'} (Room {bookingResult.hotelDetails?.room?.roomNum || 'N/A'})
                        </p>
                      </div>
                      <p className="text-blue-600 font-medium">
                        ${bookingResult.hotelDetails?.room?.pricePerNight || 'N/A'}/night
                      </p>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <div>
                        <p className="flex items-center">
                          <FaCalendarAlt className="mr-1" /> Check-in: {bookingResult.hotelDetails?.checkInDate 
                            ? new Date(bookingResult.hotelDetails.checkInDate).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                        <p className="flex items-center mt-1">
                          <FaCalendarAlt className="mr-1" /> Check-out: {bookingResult.hotelDetails?.checkOutDate 
                            ? new Date(bookingResult.hotelDetails.checkOutDate).toLocaleDateString() 
                            : 'N/A'}
                        </p>
                      </div>
                      <p>Total Nights: {bookingResult.hotelDetails?.totalNights || 'N/A'}</p>
                    </div>
                    
                    {/* Room Amenities */}
                    {bookingResult.hotelDetails?.room?.amenities && bookingResult.hotelDetails.room.amenities.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Room Amenities:</p>
                        <div className="flex flex-wrap gap-2">
                          {bookingResult.hotelDetails.room.amenities.map((amenity, index) => (
                            <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {amenity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Total Price */}
                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Total Stay</p>
                          <p className="font-medium">
                            {bookingResult.hotelDetails?.totalNights || 'N/A'} nights
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Total Price</p>
                          <p className="text-xl font-bold text-blue-600">
                            ${((bookingResult.hotelDetails?.room?.pricePerNight || 0) * (bookingResult.hotelDetails?.totalNights || 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (bookingResult?.bookingReference) {
                      const token = localStorage.getItem('token');
                      if (token) {
                        // Extract booking ID from the reference if it's a numeric string
                        const bookingId = parseInt(bookingResult.bookingReference, 10);
                        
                        // Create a fetch request to get invoice
                        fetch(`/api/hotels/hotelbookingpdf?bookingId=${bookingId}`, {
                          method: 'GET',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        })
                        .then(response => {
                          if (response.ok) {
                            return response.blob();
                          }
                          throw new Error('Failed to fetch invoice');
                        })
                        .then(blob => {
                          // Create a URL for the blob
                          const url = window.URL.createObjectURL(blob);
                          // Open the PDF in a new tab
                          window.open(url, '_blank');
                        })
                        .catch(error => {
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

      {/* Flight details modal */}
      {showFlightDetailModal && selectedFlightDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Flight Details</h2>
              <button 
                onClick={() => setShowFlightDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            {/* Price and duration summary */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">Total Duration</p>
                  <p className="font-medium text-gray-900">{formatDuration(selectedFlightDetail.totalDuration)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Price</p>
                  <p className="text-xl font-bold text-blue-600">
                    ${selectedFlightDetail.totalPrice.toFixed(2)} {selectedFlightDetail.currency}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Flight legs */}
            <div className="space-y-6">
              {selectedFlightDetail.legs.map((leg, index) => (
                <div key={index} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-medium text-gray-900">{leg.airline} {leg.flightNumber}</p>
                      <p className="text-sm text-gray-600">{new Date(leg.departureTime).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    {/* Departure */}
                    <div className="w-1/3">
                      <p className="font-bold text-gray-900">{new Date(leg.departureTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-sm text-gray-600">{leg.origin}</p>
                    </div>
                    
                    {/* Flight path */}
                    <div className="flex-1 px-4">
                      <div className="relative flex items-center justify-center">
                        <div className="border-t border-gray-300 w-full"></div>
                        <div className="absolute bg-white px-2">
                          <p className="text-xs text-gray-500">{formatDuration(leg.duration)}</p>
                          <FaPlane className="text-blue-500 mx-auto" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Arrival */}
                    <div className="w-1/3 text-right">
                      <p className="font-bold text-gray-900">{new Date(leg.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      <p className="text-sm text-gray-600">{leg.destination}</p>
                    </div>
                  </div>
                  
                  {/* Layover information */}
                  {leg.layover && (
                    <div className="mt-4 bg-gray-50 p-3 rounded text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">Layover: </span>
                        {formatDuration(leg.layover.duration)} in {leg.layover.location}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Action buttons */}
            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => setShowFlightDetailModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                onClick={() => {
                  // Store the hotel selection in localStorage
                  if (typeof window !== 'undefined') {
                    // Store hotel selection
                    localStorage.setItem('pendingHotelSelection', JSON.stringify({
                      hotelId: selectedHotelId,
                      roomId: selectedRoomId,
                      checkInDate: router.query.checkInDate,
                      checkOutDate: router.query.checkOutDate
                    }));
                    
                    // Store flight search parameters for pre-filling on landing page
                    localStorage.setItem('flightSearchParams', JSON.stringify({
                      origin: selectedFlightDetail?.legs[0]?.origin.split('(')[0].trim(),
                      destination: selectedFlightDetail?.legs[selectedFlightDetail.legs.length-1]?.destination.split('(')[0].trim(),
                      departureDate: new Date(selectedFlightDetail?.legs[0]?.departureTime).toISOString().split('T')[0],
                      returnDate: router.query.checkOutDate,
                      activeTab: 'flight', // Set active tab to flight search
                      pendingHotel: true,
                      fromFlightSuggestions: true
                    }));
                    
                    // Store hotel search parameters to enable "Go Back to Hotels" button - EXACT SAME FORMAT as Search All Flights
                    localStorage.setItem('hotelSearchReturn', JSON.stringify({
                      destination: router.query.destination,
                      checkInDate: router.query.checkInDate,
                      checkOutDate: router.query.checkOutDate,
                      hotelId: selectedHotelId,
                      roomId: selectedRoomId,
                      expandedHotelId: expandedHotelId,
                      filters: filters, // Store all filter settings
                      showBackButton: true,
                      fromFlightSuggestions: true
                    }));
                  }
                  setShowFlightDetailModal(false);
                }}
              >
                Book This Flight
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
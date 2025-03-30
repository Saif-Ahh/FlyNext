// pages/index.tsx
// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import NotificationBell from '@/components/NotificationBell';
import { useRouter } from 'next/router';
import { FaPlane, FaHotel, FaStar, FaMapMarkerAlt, FaCalendarAlt, FaUsers, FaUser, FaChevronDown, FaGlobe, FaSignOutAlt, FaUserCircle, FaPlus, FaCity, FaTicketAlt, FaTrash, FaShoppingCart } from 'react-icons/fa';

// Define the hotel type
interface Hotel {
  name: string;
  imageUrl: string;
  location: string;
  starRating: number;
}

interface Airport {
  code: string;
  name: string;
}

interface AutocompleteResponse {
  cities: string[];
  airportsByName: Airport[];
  airportsByCode: Airport[];
}

export default function Home() {
  const router = useRouter();
  const [searchType, setSearchType] = useState<'flights' | 'hotels'>('flights');
  const [isScrolled, setIsScrolled] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [featuredHotels, setFeaturedHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way');
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<AutocompleteResponse | null>(null);
  const [toSuggestions, setToSuggestions] = useState<AutocompleteResponse | null>(null);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Load saved search inputs from localStorage
  useEffect(() => {
    const savedSearchType = localStorage.getItem('searchType');
    const savedTripType = localStorage.getItem('tripType');
    const savedFromValue = localStorage.getItem('fromValue');
    const savedToValue = localStorage.getItem('toValue');
    const savedDepartureDate = localStorage.getItem('departureDate');
    const savedReturnDate = localStorage.getItem('returnDate');
    
    // Check if we have flight search params from hotels page
    const flightSearchParams = localStorage.getItem('flightSearchParams');
    if (flightSearchParams) {
      try {
        const params = JSON.parse(flightSearchParams);
        setSearchType('flights');
        if (params.origin) setFromValue(params.origin);
        if (params.destination) setToValue(params.destination);
        if (params.departureDate) setDepartureDate(params.departureDate);
        if (params.returnDate) setReturnDate(params.returnDate);
        // Clear the flight search params after using them
        localStorage.removeItem('flightSearchParams');
      } catch (error) {
        console.error('Error parsing flight search params:', error);
      }
    } else {
      // Use saved values if no flight search params from hotels page
      if (savedSearchType) setSearchType(savedSearchType as 'flights' | 'hotels');
      if (savedTripType) setTripType(savedTripType as 'one-way' | 'round-trip');
      if (savedFromValue) setFromValue(savedFromValue);
      if (savedToValue) setToValue(savedToValue);
      if (savedDepartureDate) setDepartureDate(savedDepartureDate);
      if (savedReturnDate) setReturnDate(savedReturnDate);
    }
  }, []);

  // Save search inputs to localStorage when they change
  useEffect(() => {
    localStorage.setItem('searchType', searchType);
    localStorage.setItem('tripType', tripType);
    localStorage.setItem('fromValue', fromValue);
    localStorage.setItem('toValue', toValue);
    localStorage.setItem('departureDate', departureDate);
    localStorage.setItem('returnDate', returnDate);
  }, [searchType, tripType, fromValue, toValue, departureDate, returnDate]);

  // Restore search inputs from URL query parameters
  useEffect(() => {
    const { source, destination, departureDate: depDate, returnDate: retDate, tripType: type } = router.query;
    
    if (source) setFromValue(source as string);
    if (destination) setToValue(destination as string);
    if (depDate) setDepartureDate(depDate as string);
    if (retDate) setReturnDate(retDate as string);
    if (type) setTripType(type as 'one-way' | 'round-trip');
  }, [router.query]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);

    // Fetch user profile data if logged in
    if (token) {
      const fetchUserProfile = async () => {
        try {
          const response = await fetch('/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      };
      
      fetchUserProfile();
    }
  }, []);

  useEffect(() => {
    // Fetch featured hotels
    const fetchHotels = async () => {
      try {
        const response = await fetch('/api/hotels/getAllHotels');
        if (response.ok) {
          const data = await response.json();
          setFeaturedHotels(data);
        }
      } catch (error) {
        console.error('Error fetching hotels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, []);

  // Debounced function to fetch autocomplete suggestions
  const fetchSuggestions = useCallback(async (keyword: string, setSuggestions: (data: AutocompleteResponse | null) => void) => {
    if (!keyword) {
      setSuggestions(null);
      return;
    }

    try {
      const response = await fetch(`/api/flights/autoComplete?keyword=${encodeURIComponent(keyword)}`);
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      const data = await response.json();
      setSuggestions(data);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions(null);
    }
  }, []);

  // Debounce the fetch function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (fromValue) {
        fetchSuggestions(fromValue, setFromSuggestions);
      } else {
        setFromSuggestions(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fromValue, fetchSuggestions]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (toValue) {
        fetchSuggestions(toValue, setToSuggestions);
      } else {
        setToSuggestions(null);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [toValue, fetchSuggestions]);

  const handleSuggestionClick = (suggestion: string | Airport, isFrom: boolean) => {
    let displayValue: string;
    
    if (typeof suggestion === 'string') {
      // If it's a city name, use it as is
      displayValue = suggestion;
    } else {
      // If it's an airport, only use the airport name
      displayValue = suggestion.name;
    }
    
    if (isFrom) {
      setFromValue(displayValue);
      setShowFromSuggestions(false);
    } else {
      setToValue(displayValue);
      setShowToSuggestions(false);
    }
  };

  const renderSuggestions = (suggestions: AutocompleteResponse | null, isFrom: boolean) => {
    if (!suggestions) return null;

    const allSuggestions = [
      ...suggestions.cities.map(city => ({ type: 'city', value: city })),
      ...suggestions.airportsByName.map(airport => ({ type: 'airport', value: airport })),
      ...suggestions.airportsByCode.map(airport => ({ type: 'airport', value: airport }))
    ];

    if (allSuggestions.length === 0) return null;

    return (
      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
        {allSuggestions.map((suggestion, index) => (
          <div
            key={index}
            className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center"
            onClick={() => handleSuggestionClick(suggestion.value, isFrom)}
          >
            {suggestion.type === 'city' ? (
              <FaCity className="text-gray-400 mr-2" />
            ) : (
              <FaPlane className="text-gray-400 mr-2" />
            )}
            <span>
              {typeof suggestion.value === 'string'
                ? suggestion.value
                : `${suggestion.value.code} - ${suggestion.value.name}`}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setShowAccountMenu(false);
    window.location.reload();
  };

  const handleSearch = () => {
    if (searchType === 'flights') {
      console.log('Search values:', {
        fromValue,
        toValue,
        departureDate,
        returnDate,
        tripType
      });

      // Validate required fields
      if (!fromValue || !toValue || !departureDate) {
        setError('Please fill in all required fields');
        return;
      }

      // Check if source and destination are the same
      if (fromValue.toLowerCase() === toValue.toLowerCase()) {
        setError('Source and destination cannot be the same. Please select different locations.');
        return;
      }

      // Check if fromValue matches any suggestion (case insensitive)
      const fromMatches = fromSuggestions && (
        fromSuggestions.cities.some(city => city.toLowerCase() === fromValue.toLowerCase()) ||
        fromSuggestions.airportsByName.some(airport => 
          airport.name.toLowerCase() === fromValue.toLowerCase() ||
          airport.code.toLowerCase() === fromValue.toLowerCase()
        ) ||
        fromSuggestions.airportsByCode.some(airport => 
          airport.name.toLowerCase() === fromValue.toLowerCase() ||
          airport.code.toLowerCase() === fromValue.toLowerCase()
        )
      );

      if (!fromMatches) {
        setError('Please enter a valid departure location. Use the suggestions to find available locations.');
        return;
      }

      // Check if toValue matches any suggestion (case insensitive)
      const toMatches = toSuggestions && (
        toSuggestions.cities.some(city => city.toLowerCase() === toValue.toLowerCase()) ||
        toSuggestions.airportsByName.some(airport => 
          airport.name.toLowerCase() === toValue.toLowerCase() ||
          airport.code.toLowerCase() === toValue.toLowerCase()
        ) ||
        toSuggestions.airportsByCode.some(airport => 
          airport.name.toLowerCase() === toValue.toLowerCase() ||
          airport.code.toLowerCase() === toValue.toLowerCase()
        )
      );

      if (!toMatches) {
        setError('Please enter a valid destination. Use the suggestions to find available locations.');
        return;
      }

      // Validate dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const depDate = new Date(departureDate);
      depDate.setHours(0, 0, 0, 0);

      if (depDate < today) {
        setError('Departure date cannot be in the past');
        return;
      }

      if (tripType === 'round-trip') {
        if (!returnDate) {
          setError('Please select a return date for round-trip flights');
          return;
        }
        const retDate = new Date(returnDate);
        retDate.setHours(0, 0, 0, 0);
        
        if (retDate < depDate) {
          setError('Return date must be after departure date');
          return;
        }
      }

      // Clear any previous errors
      setError(null);

      // Navigate to the appropriate page
      if (tripType === 'one-way') {
        router.push({
          pathname: '/one-way',
          query: {
            source: fromValue,
            destination: toValue,
            departureDate: departureDate
          }
        });
      } else {
        router.push({
          pathname: '/round-trip',
          query: {
            source: fromValue,
            destination: toValue,
            departureDate: departureDate,
            returnDate: returnDate
          }
        });
      }
    } else {
      // For hotel searches
      if (!toValue || !checkInDate || !checkOutDate) {
        setError('Please fill in all required fields');
        return;
      }

      console.log("Search parameters:", { 
        destination: toValue, 
        checkInDate, 
        checkOutDate 
      });

      // Use router.push with a specific configuration
      router.push({
        pathname: '/hotels',
        query: {
          destination: toValue,
          checkInDate: checkInDate,
          checkOutDate: checkOutDate
        }
      });
    }
  };

  // Add a clear function to reset all flight search fields
  const clearFlightSearch = () => {
    setFromValue('');
    setToValue('');
    setDepartureDate('');
    setReturnDate('');
    setError(null);
  };

  // Add state for hotel return info
  const [hotelSearchReturn, setHotelSearchReturn] = useState<any>(null);

  // Load hotel return info from localStorage
  useEffect(() => {
    const hotelSearchReturnData = localStorage.getItem('hotelSearchReturn');
    if (hotelSearchReturnData) {
      try {
        const parsedData = JSON.parse(hotelSearchReturnData);
        if (parsedData.showBackButton && parsedData.fromFlightSuggestions) {
          setHotelSearchReturn(parsedData);
        }
      } catch (error) {
        console.error('Error parsing hotel search return data:', error);
      }
    }
  }, []);

  // Function to return to hotel search results
  const handleReturnToHotels = () => {
    if (hotelSearchReturn) {
      router.push({
        pathname: '/hotels',
        query: {
          destination: hotelSearchReturn.destination,
          checkInDate: hotelSearchReturn.checkInDate,
          checkOutDate: hotelSearchReturn.checkOutDate
        }
      });
    }
  };

  return (
    <>
      <Head>
        <title>FlyNext - Book Flights & Hotels</title>
        <meta name="description" content="Book your next flight and hotel stay with FlyNext" />
      </Head>

      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <FaPlane className="h-8 w-8 text-blue-600" />
              <span className={`ml-2 text-xl font-bold ${ isScrolled ? '!text-gray-800' : '!text-white'} `}>FlyNext</span>
            </div>
            <div className="flex items-center space-x-4">
              {isLoggedIn ? (
                <>
                <Link
                  href="/my-itineraries"
                  className={`flex items-center space-x-2 transition-colors duration-300 ${
                    isScrolled ? '!text-gray-800 hover:text-blue-600' : '!text-white hover:!text-gray-200'
                  }`}
                >
                  <FaUserCircle className="text-purple-500" />
                  <span>My Itineraries</span>
                </Link>
                  <Link
                    href="/my-hotels"
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-300 ${
                      isScrolled 
                        ? 'text-white bg-blue-600 hover:bg-blue-700' 
                        : 'text-blue-600 bg-white hover:bg-white/90'
                    }`}
                  >
                    <FaHotel className="mr-2" />
                    My Hotels
                  </Link>
                  <Link
                    href="/checkout"
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-300 ${
                      isScrolled 
                        ? 'text-white bg-green-600 hover:bg-green-700' 
                        : 'text-green-600 bg-white hover:bg-white/90'
                    }`}
                  >
                    <FaShoppingCart className="mr-2" />
                    Checkout
                  </Link>
                  <Link
                    href="/flight-bookings"
                    className={`flex items-center space-x-2 transition-colors duration-300 ${
                      isScrolled ? '!text-gray-800 hover:text-blue-600' : '!text-white hover:!text-gray-200'
                    }`}
                  >
                    <FaTicketAlt className="text-green-500" />
                    <span>My Flights</span>
                  </Link>

                  <Link
                    href="/hotel-bookings"
                    className={`flex items-center space-x-2 transition-colors duration-300 ${
                      isScrolled ? '!text-gray-800 hover:text-blue-600' : '!text-white hover:!text-gray-200'
                    }`}
                  >
                    <FaHotel className="text-orange-500" />
                    <span>My Hotel Bookings</span>
                  </Link>

                  <NotificationBell isScrolled={isScrolled} />
                  <div className="relative ml-3">
                    <div>
                      <button
                        type="button"
                        className="flex items-center max-w-xs bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        id="user-menu-button"
                        aria-expanded="false"
                        aria-haspopup="true"
                        onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                      >
                        <span className="sr-only">Open user menu</span>
                        {user?.profilePicture ? (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden">
                            <img 
                              src={user.profilePicture} 
                              alt="Profile" 
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                // Fallback to default image if the URL is invalid
                                (e.target as HTMLImageElement).src = '/default-profile.jpg';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <FaUser className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Dropdown menu */}
                    {isAccountMenuOpen && (
                      <div
                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none"
                        role="menu"
                        aria-orientation="vertical"
                        aria-labelledby="user-menu-button"
                        tabIndex={-1}
                      >
                        <Link
                          href="/account"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          tabIndex={-1}
                          id="user-menu-item-0"
                        >
                          Account Info
                        </Link>
                        {user?.role === 'admin' && (
                          <Link
                            href="/admin"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            role="menuitem"
                            tabIndex={-1}
                            id="user-menu-item-1"
                          >
                            Admin Dashboard
                          </Link>
                        )}
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          role="menuitem"
                          tabIndex={-1}
                          id="user-menu-item-2"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <Link 
                  href="/login"
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md transition-colors duration-300 ${
                    isScrolled 
                      ? 'text-white bg-blue-600 hover:bg-blue-700' 
                      : 'text-blue-600 bg-white hover:bg-white/90'
                  }`}
                >
                  <FaUser className="mr-2" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative h-screen">
        <div className="absolute inset-0">
          <img
            src="/hero-bg.jpg"
            alt="Travel background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/40" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 pt-20">
          <h1 className="text-6xl font-bold text-white mb-6 text-center leading-tight animate-fade-in">
            Your Journey Begins with<br />
            <span className="text-blue-400">FlyNext</span>
          </h1>
          
          <p className="text-xl text-white/90 mb-12 text-center max-w-2xl animate-fade-in-up">
            Discover the world with our seamless flight and hotel booking experience
          </p>
          
          {/* Search Tabs */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-4xl p-6 transform transition-all duration-300 hover:scale-[1.02]">
            <div className="flex mb-6">
              <button
                className={`flex-1 py-3 px-4 text-center transition-all duration-300 ${
                  searchType === 'flights' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                } rounded-l-lg`}
                onClick={() => setSearchType('flights')}
              >
                <FaPlane className="inline-block mr-2" />
                Flights
              </button>
              <button
                className={`flex-1 py-3 px-4 text-center transition-all duration-300 ${
                  searchType === 'hotels' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 hover:bg-gray-200'
                } rounded-r-lg`}
                onClick={() => setSearchType('hotels')}
              >
                <FaHotel className="inline-block mr-2" />
                Hotels
              </button>
            </div>

            {/* Search Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Show the "Go Back to Hotels" button if user came from hotels page */}
              {hotelSearchReturn && searchType === 'flights' && (
                <div className="col-span-4 mb-4">
                  <button
                    onClick={handleReturnToHotels}
                    className="flex items-center justify-center w-full bg-indigo-100 text-indigo-800 px-4 py-3 rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    <FaHotel className="mr-2" />
                    Go Back to Hotel Selection
                  </button>
                </div>
              )}
              
              {searchType === 'flights' ? (
                <>
                  {/* First row - trip type, from, to */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 col-span-4">
                    <div className="relative group">
                      <select
                        value={tripType}
                        onChange={(e) => setTripType(e.target.value as 'one-way' | 'round-trip')}
                        className="w-full pl-10 pr-4 text-gray py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all appearance-none bg-white"
                      >
                        <option value="one-way">One Way</option>
                        <option value="round-trip">Round Trip</option>
                      </select>
                      <FaPlane className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <div className="relative group">
                      <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        value={fromValue}
                        onChange={(e) => {
                          setFromValue(e.target.value);
                          setShowFromSuggestions(true);
                          setError(null);
                        }}
                        onFocus={() => setShowFromSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                        placeholder="From"
                        className="w-full pl-10 text-gray pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                      {showFromSuggestions && renderSuggestions(fromSuggestions, true)}
                    </div>
                    <div className="relative group md:col-span-2">
                      <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        value={toValue}
                        onChange={(e) => {
                          setToValue(e.target.value);
                          setShowToSuggestions(true);
                          setError(null);
                        }}
                        onFocus={() => setShowToSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                        placeholder="To"
                        className="w-full pl-10 text-gray pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-sm"
                      />
                      {showToSuggestions && renderSuggestions(toSuggestions, false)}
                    </div>
                  </div>

                  {/* Second row - dates and search button */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-4 mt-4">
                    <div className="relative group">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="date"
                        value={departureDate}
                        onChange={(e) => {
                          setDepartureDate(e.target.value);
                          setError(null);
                        }}
                        placeholder="Departure Date"
                        className="w-full pl-10 text-gray pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>
                    {tripType === 'round-trip' && (
                      <div className="relative group">
                        <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="date"
                          value={returnDate}
                          onChange={(e) => {
                            setReturnDate(e.target.value);
                            setError(null);
                          }}
                          placeholder="Return Date"
                          min={departureDate}
                          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                        />
                      </div>
                    )}
                    <div className={tripType === 'round-trip' ? 'relative group' : 'relative group md:col-span-2'}>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSearch}
                          className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300"
                        >
                          Search Flights
                        </button>
                        <button
                          onClick={clearFlightSearch}
                          className="bg-gray-200 text-gray-700 px-3 py-3 rounded-lg hover:bg-gray-300 transition-colors duration-300"
                          title="Clear all fields"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Hotel search form */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 col-span-4">
                    <div className="relative group">
                      <FaMapMarkerAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="text"
                        value={toValue}
                        onChange={(e) => {
                          setToValue(e.target.value);
                          setShowToSuggestions(true);
                          setError(null);
                        }}
                        onFocus={() => setShowToSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                        placeholder="City, Country"
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                      {showToSuggestions && renderSuggestions(toSuggestions, false)}
                    </div>
                    <div className="relative group">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => {
                          setCheckInDate(e.target.value);
                          setError(null);
                        }}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="relative group">
                      <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => {
                          setCheckOutDate(e.target.value);
                          setError(null);
                        }}
                        min={checkInDate || new Date().toISOString().split('T')[0]}
                        className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  
                  {/* Search button */}
                  <div className="mt-4 col-span-4">
                    <button
                      onClick={handleSearch}
                      className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300"
                    >
                      Search Hotels
                    </button>
                  </div>
                </>
              )}
            </div>
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <FaChevronDown className="text-white text-2xl" />
          </div>
        </div>
      </div>

      {/* Featured Destinations */}
      <section className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Popular Destinations</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Explore our most sought-after destinations and find your next adventure
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {isLoading ? (
              // Loading skeletons
              [...Array(3)].map((_, index) => (
                <div key={index} className="relative h-96 rounded-2xl overflow-hidden bg-gray-200 animate-pulse">
                  <div className="absolute bottom-6 left-6">
                    <div className="h-8 w-32 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 w-24 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ))
            ) : featuredHotels.length > 0 ? (
              // Display actual hotels
              featuredHotels.map((hotel) => (
                <div key={hotel.name} className="relative h-96 rounded-2xl overflow-hidden group cursor-pointer transform transition-all duration-300 hover:scale-105">
                  <img
                    src={hotel.imageUrl}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all">
                    <div className="absolute bottom-6 left-6 text-white">
                      <h3 className="text-3xl font-bold mb-2">{hotel.name}</h3>
                      <div className="flex items-center mb-2">
                        <FaMapMarkerAlt className="mr-1" />
                        <span>{hotel.location}</span>
                      </div>
                      <div className="flex items-center mb-4">
                        {[...Array(5)].map((_, i) => {
                          const starValue = i + 1;
                          const isHalfStar = hotel.starRating >= i && hotel.starRating < starValue;
                          const isFullStar = hotel.starRating >= starValue;
                          
                          return (
                            <div key={i} className="relative">
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
                        })}
                      </div>
                      <button className="mt-4 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-all">
                        Explore
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback if no hotels are found
              <div className="col-span-3 text-center py-12">
                <p className="text-gray-500">No destinations available at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">Why Choose FlyNext?</h2>
          <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Experience travel booking like never before with our premium services
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <FaStar className="text-5xl text-blue-600" />,
                title: "Best Prices",
                description: "We guarantee the best prices for flights and hotels with our price match promise"
              },
              {
                icon: <FaUsers className="text-5xl text-blue-600" />,
                title: "24/7 Support",
                description: "Our dedicated customer support team is available round the clock to assist you"
              },
              {
                icon: <FaGlobe className="text-5xl text-blue-600" />,
                title: "Global Coverage",
                description: "Access to thousands of hotels and flights across the globe"
              }
            ].map((feature, index) => (
              <div key={index} className="text-center p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2">
                <div className="mb-6">{feature.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Sign up now and get exclusive deals on your first booking! Plus, earn rewards with every trip.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/signup"
              className="bg-white text-blue-600 py-3 px-8 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105"
            >
              Sign Up Now
            </Link>
            <button className="border-2 border-white text-white py-3 px-8 rounded-lg text-lg font-semibold hover:bg-white/10 transition-all transform hover:scale-105">
              Learn More
            </button>
          </div>
        </div>
      </section>
    </>
  );
} 
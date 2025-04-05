import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaHotel, FaCalendarAlt, FaBed, FaMapMarkerAlt, FaDownload, FaTimes, FaSearch, FaUser } from 'react-icons/fa';

interface HotelRoom {
  id: string;
  name: string;
  roomNum: string;
  amenities: string[];
  pricePerNight: number;
}

interface Hotel {
  id: string;
  name: string;
  location: string;
  address: string;
  starRating: number;
}

interface Booking {
  id: number;
  hotelId: string;
  hotelName: string;
  roomType: string;
  roomNum: string;
  price: number;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  createdAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  userId: string;
  hotelDetails?: Hotel;
  roomDetails?: HotelRoom;
}

interface BookingsResponse {
  bookings: Booking[];
}

export default function MyHotelsBookings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string>('all');
  
  // New filter states
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all');
  const [roomTypes, setRoomTypes] = useState<string[]>([]);

  // New availability tracking states
  const [activeTab, setActiveTab] = useState<'bookings' | 'availability' | 'room-management'>('bookings');
  const [availabilityHotel, setAvailabilityHotel] = useState<string>('');
  const [availabilityRoomType, setAvailabilityRoomType] = useState<string>('');
  const [availabilityStartDate, setAvailabilityStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [availabilityEndDate, setAvailabilityEndDate] = useState<string>(
    new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0]
  );
  const [availabilityData, setAvailabilityData] = useState<{
    totalRooms: number;
    bookedRooms: number;
    availableRooms: number;
  } | null>(null);
  const [availabilityIsLoading, setAvailabilityIsLoading] = useState(false);
  
  // Room management states
  const [managementHotel, setManagementHotel] = useState<string>('');
  const [managementRoomType, setManagementRoomType] = useState<string>('');
  const [newRoomAmount, setNewRoomAmount] = useState<number>(0);
  const [currentRoomAmount, setCurrentRoomAmount] = useState<number>(0);
  const [isUpdatingRooms, setIsUpdatingRooms] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [canceledReservations, setCanceledReservations] = useState<any[]>([]);

  // Use useEffect to set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);

    // Get hotelId from URL query parameter
    const { hotelId } = router.query;
    if (hotelId && typeof hotelId === 'string') {
      setSelectedHotel(hotelId);
    } else {
      const savedSelectedHotel = localStorage.getItem('myHotelsBookingsSelectedHotel');
      if (savedSelectedHotel) {
        setSelectedHotel(savedSelectedHotel);
      }
    }
  }, [router.query]);

  // Save selected hotel to localStorage when it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('myHotelsBookingsSelectedHotel', selectedHotel);
    }
  }, [selectedHotel, isClient]);

  // Extract unique room types from bookings
  useEffect(() => {
    if (bookings.length > 0) {
      const types = [...new Set(bookings.map(booking => booking.roomType))];
      setRoomTypes(types);
    }
  }, [bookings]);

  // Filter bookings when filter criteria change
  useEffect(() => {
    let filtered = bookings;
    
    // Filter by hotel if not "all"
    if (selectedHotel !== 'all') {
      filtered = filtered.filter(booking => booking.hotelId === selectedHotel);
    }
    
    // Filter by room type if not "all"
    if (selectedRoomType !== 'all') {
      filtered = filtered.filter(booking => booking.roomType === selectedRoomType);
    }
    
    // Filter by date range if dates are selected
    if (dateRangeStart && dateRangeEnd) {
      const startDate = new Date(dateRangeStart);
      const endDate = new Date(dateRangeEnd);
      
      filtered = filtered.filter(booking => {
        const bookingCheckIn = new Date(booking.checkInDate);
        const bookingCheckOut = new Date(booking.checkOutDate);
        
        // Check if the booking date range overlaps with the filter date range
        return (
          (bookingCheckIn >= startDate && bookingCheckIn <= endDate) || // Check-in date is within range
          (bookingCheckOut >= startDate && bookingCheckOut <= endDate) || // Check-out date is within range
          (bookingCheckIn <= startDate && bookingCheckOut >= endDate) // Booking spans the entire filter range
        );
      });
    }
    
    setFilteredBookings(filtered);
  }, [bookings, selectedHotel, selectedRoomType, dateRangeStart, dateRangeEnd]);

  // Reset all filters
  const resetFilters = () => {
    setSelectedHotel('all');
    setSelectedRoomType('all');
    setDateRangeStart('');
    setDateRangeEnd('');
  };

  // Fetch hotels owned by user
  useEffect(() => {
    const fetchHotels = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/hotels/getMyHotels', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          // If response is 404, that means no hotels were found
          if (response.status === 404) {
            setHotels([]);
            return;
          }
          throw new Error('Failed to fetch hotels');
        }

        const data = await response.json();
        if (data.hotels && Array.isArray(data.hotels)) {
          setHotels(data.hotels);
        } else {
          setHotels([]);
        }
      } catch (error) {
        console.error('Error fetching hotels:', error);
        setError('Failed to load your hotels. Please try again later.');
      }
    };

    fetchHotels();
  }, [router]);

  // Fetch bookings for hotels owned by user
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/hotels/ownerBookings', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data: BookingsResponse = await response.json();
        
        // Sort bookings by check-in date (most recent first)
        const sortedBookings = data.bookings.sort((a, b) => 
          new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime()
        );
        
        setBookings(sortedBookings);
        setFilteredBookings(sortedBookings);
      } catch (error) {
        setError('Failed to load bookings. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  const handleViewDetails = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  const handleCloseDetails = () => {
    setSelectedBooking(null);
  };

  const handleCancelBooking = (booking: Booking) => {
    setBookingToCancel(booking);
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!bookingToCancel) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please login again.');
        setShowCancelModal(false);
        router.push('/login');
        return;
      }

      // Log the request attempt
      console.log(`Attempting to cancel booking #${bookingToCancel.id}`);

      const response = await fetch(`/api/hotels/cancelHotelBooking?bookingId=${bookingToCancel.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Handle non-200 responses
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cancel booking error:', errorData);
        throw new Error(errorData.error || 'Failed to cancel booking');
      }

      const result = await response.json();
      console.log('Cancel booking success:', result);

      // Update only the specific booking that was cancelled
      setBookings(bookings.map(booking => 
        booking.id === bookingToCancel.id
          ? { ...booking, status: 'CANCELLED' } 
          : booking
      ));

      setShowCancelModal(false);
      setBookingToCancel(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError(`Failed to cancel booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowCancelModal(false);
    }
  };

  const handleDownloadInvoice = async (booking: Booking) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/hotels/hotelbookingpdf?bookingId=${booking.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotel-invoice-${booking.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download invoice. Please try again later.');
    }
  };

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const calculateNights = (checkInDate: string, checkOutDate: string) => {
    const startDate = new Date(checkInDate);
    const endDate = new Date(checkOutDate);
    const timeDiff = endDate.getTime() - startDate.getTime();
    const nights = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    return Math.max(1, nights);
  };

  const calculateTotalPrice = (pricePerNight: number, checkInDate: string, checkOutDate: string) => {
    const nights = calculateNights(checkInDate, checkOutDate);
    return (pricePerNight * nights).toFixed(2);
  };

  // Fetch room availability data
  const fetchRoomAvailability = async () => {
    if (!availabilityHotel || !availabilityRoomType || !availabilityStartDate || !availabilityEndDate) {
      setError('Please select a hotel, room type, and date range to view availability');
      return;
    }

    setAvailabilityIsLoading(true);
    setAvailabilityData(null);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(
        `/api/hotels/roomAvailability?hotelId=${availabilityHotel}&roomType=${availabilityRoomType}&startDate=${availabilityStartDate}&endDate=${availabilityEndDate}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch room availability');
      }

      const data = await response.json();
      setAvailabilityData(data.availability);
    } catch (error) {
      console.error('Error fetching room availability:', error);
      setError('Failed to load room availability data. Please try again later.');
    } finally {
      setAvailabilityIsLoading(false);
    }
  };

  // Extract room types for a specific hotel
  const getHotelRoomTypes = async (hotelId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return [];
      }

      const response = await fetch(`/api/hotels/userViewAvailability?hotelId=${hotelId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch hotel room information');
      }

      const data = await response.json();
      const roomTypesList = Object.keys(data.roomInformation || {});
      return roomTypesList;
    } catch (error) {
      console.error('Error fetching hotel room types:', error);
      return [];
    }
  };

  // Handle hotel select change for availability tab
  const handleAvailabilityHotelChange = (hotelId: string) => {
    setAvailabilityHotel(hotelId);
    setAvailabilityRoomType('');
    setAvailabilityData(null);
    
    // Reset error message if any
    setError(null);
  };

  // Get room count for a specific hotel and room type
  const getRoomCount = async (hotelId: string, roomType: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return 0;
      }

      const response = await fetch(
        `/api/hotels/roomAvailability?hotelId=${hotelId}&roomType=${roomType}&startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch room count');
      }

      const data = await response.json();
      return data.availability.totalRooms || 0;
    } catch (error) {
      console.error('Error fetching room count:', error);
      return 0;
    }
  };

  // Add room management handlers
  const handleFetchRoomCount = async (managementHotel: string, managementRoomType: string) => {
    if (!managementHotel || !managementRoomType) {
      setError('Please select both hotel and room type');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/hotels/getRoomCount?hotelId=${managementHotel}&roomType=${managementRoomType}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch room count');
      }
      const data = await response.json();
      
      // Ensure we have a valid number (data should be a number already from our API)
      const roomCount = !isNaN(Number(data)) ? Number(data) : 0;
      setCurrentRoomAmount(roomCount);
      setNewRoomAmount(roomCount);
      setError(null);
    } catch (error) {
      console.error('Error fetching room count:', error);
      setError('Failed to fetch room count');
      setCurrentRoomAmount(0);
      setNewRoomAmount(0);
    }
  };

  const handleUpdateRooms = async () => {
    // Validate inputs
    if (!managementHotel || !managementRoomType || newRoomAmount === undefined) {
      setError('Please select a hotel, room type, and specify a new room amount');
      return;
    }

    // If decreasing room count, show confirmation dialog
    if (newRoomAmount < currentRoomAmount) {
      setShowUpdateConfirmation(true);
      return;
    }

    // Otherwise proceed with update
    await processRoomUpdate();
  };

  const processRoomUpdate = async () => {
    setIsUpdatingRooms(true);
    setError(null);
    setUpdateSuccess(null);
    setCanceledReservations([]);
    setShowUpdateConfirmation(false);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/hotels/updateRooms', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hotelId: managementHotel,
          roomType: managementRoomType,
          newAmount: newRoomAmount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update room count');
      }

      const result = await response.json();
      
      // Update current room amount to match the new amount
      setCurrentRoomAmount(newRoomAmount);
      
      // Show success message
      setUpdateSuccess(result.message || 'Room quantity updated successfully');
      
      // If there were cancellations, show them
      if (result.canceledReservations && result.canceledReservations.length > 0) {
        setCanceledReservations(result.canceledReservations);
        
        // Also update the local bookings list
        const canceledIds = result.canceledReservations.map((res: any) => res.id);
        setBookings(bookings.map(booking => 
          canceledIds.includes(booking.id)
            ? { ...booking, status: 'CANCELLED' } 
            : booking
        ));
      }
    } catch (error) {
      console.error('Error updating room count:', error);
      setError(`Failed to update room count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUpdatingRooms(false);
    }
  };

  // Handle hotel select change for room management
  const handleManagementHotelChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const hotelId = e.target.value;
    setManagementHotel(hotelId);
    setManagementRoomType(''); // Reset room type when hotel changes
    setCurrentRoomAmount(0);
    setNewRoomAmount(0);
    setError(null);
    setUpdateSuccess(null);
    setCanceledReservations([]);
    
    // Fetch room types for this hotel if a hotel is selected
    if (hotelId) {
      try {
        const roomTypesList = await getHotelRoomTypes(hotelId);
        if (roomTypesList.length > 0) {
          setRoomTypes(roomTypesList);
        } else {
          // If no room types were found, keep the current list but show a message
          setError('No room types found for this hotel');
        }
      } catch (error) {
        console.error('Error fetching room types:', error);
        setError('Failed to load room types for this hotel');
      }
    }
  };

  // Handle room type select change for room management
  const handleManagementRoomTypeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRoomType = e.target.value;
    setManagementRoomType(selectedRoomType);
    setCurrentRoomAmount(0);
    setNewRoomAmount(0);
    setError(null);
    setUpdateSuccess(null);
    setCanceledReservations([]);

    // Wait for state updates to complete
    await new Promise(resolve => setTimeout(resolve, 0));

    if (managementHotel && selectedRoomType) {
      handleFetchRoomCount(managementHotel, selectedRoomType);
    }
  };

  // Only render content on the client side to avoid hydration errors
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
        <title>My Hotels Bookings - FlyNext</title>
        <meta name="description" content="View and manage bookings for your hotels" />
      </Head>

      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
              <FaHotel className="mr-2" />
              Back to Home
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">Manage Your Hotels</h1>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                  activeTab === 'bookings' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Bookings
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                  activeTab === 'availability' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Room Availability
              </button>
              <button
                onClick={() => setActiveTab('room-management')}
                className={`py-4 px-6 font-medium text-sm border-b-2 ${
                  activeTab === 'room-management' 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Room Management
              </button>
            </nav>
          </div>

          {activeTab === 'bookings' ? (
            <>
              {/* Filter Controls for Bookings Tab */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Filter Bookings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Hotel Select */}
                  <div>
                    <label htmlFor="hotel-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Hotel
                    </label>
                    <select
                      id="hotel-select"
                      value={selectedHotel}
                      onChange={(e) => setSelectedHotel(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="all">All Hotels</option>
                      {hotels.map((hotel) => (
                        <option key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Room Type Select */}
                  <div>
                    <label htmlFor="room-type-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Room Type
                    </label>
                    <select
                      id="room-type-select"
                      value={selectedRoomType}
                      onChange={(e) => setSelectedRoomType(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="all">All Room Types</option>
                      {roomTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Date Range - Start */}
                  <div>
                    <label htmlFor="date-range-start" className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range (From)
                    </label>
                    <input
                      id="date-range-start"
                      type="date"
                      value={dateRangeStart}
                      onChange={(e) => setDateRangeStart(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  {/* Date Range - End */}
                  <div>
                    <label htmlFor="date-range-end" className="block text-sm font-medium text-gray-700 mb-1">
                      Date Range (To)
                    </label>
                    <input
                      id="date-range-end"
                      type="date"
                      value={dateRangeEnd}
                      min={dateRangeStart}
                      onChange={(e) => setDateRangeEnd(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                {/* Reset Filters Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300"
                  >
                    Reset Filters
                  </button>
                </div>
              </div>

              <p className="mt-2 text-sm text-gray-500 mb-4">
                {filteredBookings.length} booking(s) found
              </p>

              {filteredBookings.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">No bookings found</h2>
                  <p className="text-gray-600 mb-6">You don't have any hotel bookings yet.</p>
                  <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300">
                    Back to Dashboard
                  </Link>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredBookings.map((booking) => (
                    <div key={booking.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.hotelName} - {booking.roomType}
                            </h3>
                            <div className="flex items-center mt-1 text-sm text-gray-500">
                              <FaUser className="mr-1" />
                              <span>{booking.firstName} {booking.lastName || 'N/A'}</span>
                            </div>
                            <p className="flex items-center mt-2 text-sm text-gray-500">
                              <FaCalendarAlt className="mr-1" />
                              <span>{formatDate(booking.checkInDate)} to {formatDate(booking.checkOutDate)}</span>
                              <span className="mx-2">•</span>
                              <span>{calculateNights(booking.checkInDate, booking.checkOutDate)} nights</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">Booking ID</p>
                            <p className="text-lg font-bold text-blue-600">#{booking.id}</p>
                            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                              booking.status === 'Valid' ? 'bg-green-100 text-green-800' :
                              booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {booking.status}
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium text-gray-900">Room {booking.roomNum}</h4>
                              <p className="text-sm text-gray-500 mt-1">Booking date: {new Date(booking.createdAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">Price per night</p>
                              <p className="text-lg font-semibold">${booking.price}</p>
                              <p className="text-sm text-gray-600 mt-1">Total</p>
                              <p className="text-lg font-bold text-blue-600">
                                ${calculateTotalPrice(booking.price, booking.checkInDate, booking.checkOutDate)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center text-gray-500">
                              <FaBed className="mr-1" />
                              <span>{booking.roomType}</span>
                            </div>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewDetails(booking)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
                            >
                              View Details
                            </button>
                            {booking.status === 'Valid' && (
                              <button
                                onClick={() => handleCancelBooking(booking)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadInvoice(booking)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300"
                            >
                              <FaDownload className="inline-block mr-1" />
                              Invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : activeTab === 'availability' ? (
            <>
              {/* Room Availability Tab Content */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Room Availability Trends</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Hotel Select for Availability */}
                  <div>
                    <label htmlFor="availability-hotel-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Hotel
                    </label>
                    <select
                      id="availability-hotel-select"
                      value={availabilityHotel}
                      onChange={(e) => handleAvailabilityHotelChange(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select a hotel</option>
                      {hotels.map((hotel) => (
                        <option key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Room Type Select for Availability */}
                  <div>
                    <label htmlFor="availability-room-type-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Room Type
                    </label>
                    <select
                      id="availability-room-type-select"
                      value={availabilityRoomType}
                      onChange={(e) => setAvailabilityRoomType(e.target.value)}
                      disabled={!availabilityHotel || roomTypes.length === 0}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select room type</option>
                      {roomTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Start Date for Availability */}
                  <div>
                    <label htmlFor="availability-start-date" className="block text-sm font-medium text-gray-700 mb-1">
                      From Date
                    </label>
                    <input
                      id="availability-start-date"
                      type="date"
                      value={availabilityStartDate}
                      onChange={(e) => setAvailabilityStartDate(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  {/* End Date for Availability */}
                  <div>
                    <label htmlFor="availability-end-date" className="block text-sm font-medium text-gray-700 mb-1">
                      To Date
                    </label>
                    <input
                      id="availability-end-date"
                      type="date"
                      value={availabilityEndDate}
                      min={availabilityStartDate}
                      onChange={(e) => setAvailabilityEndDate(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  {/* Check Availability Button */}
                  <div className="flex items-end">
                    <button
                      onClick={fetchRoomAvailability}
                      disabled={!availabilityHotel || !availabilityRoomType || !availabilityStartDate || !availabilityEndDate || availabilityIsLoading}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {availabilityIsLoading ? 'Loading...' : 'Check Availability'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Availability Results */}
              {availabilityData ? (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                    <h3 className="text-lg font-semibold text-blue-800">
                      Availability for {availabilityRoomType} rooms
                    </h3>
                    <p className="text-sm text-blue-600">
                      {new Date(availabilityStartDate).toLocaleDateString()} to {new Date(availabilityEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="p-6">
                    <div className="flex flex-wrap">
                      {/* Total Rooms */}
                      <div className="w-full sm:w-1/3 px-4 py-4">
                        <div className="bg-gray-50 p-4 rounded-lg text-center">
                          <p className="text-sm text-gray-500">Total Rooms</p>
                          <p className="text-3xl font-bold text-gray-800">{availabilityData.totalRooms}</p>
                        </div>
                      </div>
                      
                      {/* Booked Rooms */}
                      <div className="w-full sm:w-1/3 px-4 py-4">
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                          <p className="text-sm text-red-500">Booked Rooms</p>
                          <p className="text-3xl font-bold text-red-600">{availabilityData.bookedRooms}</p>
                        </div>
                      </div>
                      
                      {/* Available Rooms */}
                      <div className="w-full sm:w-1/3 px-4 py-4">
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                          <p className="text-sm text-green-500">Available Rooms</p>
                          <p className="text-3xl font-bold text-green-600">{availabilityData.availableRooms}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Occupancy Rate Visualization */}
                    <div className="mt-8">
                      <p className="text-sm font-medium text-gray-700 mb-2">Occupancy Rate</p>
                      <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 bottom-0 bg-blue-600 rounded-full"
                          style={{ 
                            width: `${availabilityData.totalRooms === 0 ? 0 : (availabilityData.bookedRooms / availabilityData.totalRooms) * 100}%` 
                          }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <p className="text-sm font-medium text-white">
                            {availabilityData.totalRooms === 0 ? 0 : Math.round((availabilityData.bookedRooms / availabilityData.totalRooms) * 100)}% Occupied
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : availabilityIsLoading ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <div className="animate-spin mx-auto h-12 w-12 border-b-2 border-blue-500 rounded-full"></div>
                  <p className="mt-4 text-gray-600">Loading availability data...</p>
                </div>
              ) : error ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600">Please select a hotel, room type, and date range to check room availability.</p>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Room Management Tab Content */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Update Room Quantity</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Hotel Select for Room Management */}
                  <div>
                    <label htmlFor="management-hotel-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Select Hotel
                    </label>
                    <select
                      id="management-hotel-select"
                      value={managementHotel}
                      onChange={(e) => handleManagementHotelChange(e)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select a hotel</option>
                      {hotels.map((hotel) => (
                        <option key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Room Type Select for Room Management */}
                  <div>
                    <label htmlFor="management-room-type-select" className="block text-sm font-medium text-gray-700 mb-1">
                      Room Type
                    </label>
                    <select
                      id="management-room-type-select"
                      value={managementRoomType}
                      onChange={(e) => handleManagementRoomTypeChange(e)}
                      disabled={!managementHotel || roomTypes.length === 0}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Select room type</option>
                      {roomTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Current Room Amount Display */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Quantity
                    </label>
                    <div className="block w-full pl-3 pr-10 py-2 border border-gray-200 bg-gray-50 rounded-md sm:text-sm">
                      {currentRoomAmount}
                    </div>
                  </div>
                  
                  {/* New Room Amount Input */}
                  <div>
                    <label htmlFor="new-room-amount" className="block text-sm font-medium text-gray-700 mb-1">
                      New Quantity
                    </label>
                    <input
                      id="new-room-amount"
                      type="number"
                      min="0"
                      value={newRoomAmount}
                      onChange={(e) => setNewRoomAmount(parseInt(e.target.value) || 0)}
                      className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                {/* Update Button */}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleUpdateRooms}
                    disabled={newRoomAmount >= currentRoomAmount}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 disabled:bg-blue-300 disabled:cursor-not-allowed`}
                  >
                    {isUpdatingRooms ? 'Updating...' : 'Update Room Quantity'}
                  </button>
                </div>
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600">{error}</p>
                  </div>
                )}
                
                {updateSuccess && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-600 font-medium">{updateSuccess}</p>
                    
                    {canceledReservations.length > 0 && (
                      <div className="mt-2">
                        <p className="text-gray-700 font-medium">The following reservations were canceled:</p>
                        <ul className="mt-2 list-disc list-inside text-sm text-gray-600">
                          {canceledReservations.map((reservation, index) => (
                            <li key={index}>
                              Booking #{reservation.id} - {reservation.firstName} {reservation.lastName}: 
                              {new Date(reservation.checkInDate).toLocaleDateString()} to {new Date(reservation.checkOutDate).toLocaleDateString()}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="mt-4 bg-yellow-50 p-4 rounded-lg">
                  <p className="text-yellow-700">
                    <strong>Note:</strong> Reducing the number of rooms may result in cancellation of existing reservations.
                    The system will cancel the most recent reservations if necessary.
                  </p>
                </div>
              </div>
              
              {managementHotel && managementRoomType && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                    <h3 className="text-lg font-semibold text-blue-800">
                      Current Bookings for {managementRoomType} rooms
                    </h3>
                  </div>
                  
                  <div className="p-6">
                    {filteredBookings.filter(b => 
                      b.hotelId === managementHotel && 
                      b.roomType === managementRoomType && 
                      b.status === 'Valid'
                    ).length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {filteredBookings
                          .filter(b => 
                            b.hotelId === managementHotel && 
                            b.roomType === managementRoomType && 
                            b.status === 'Valid'
                          )
                          .map((booking) => (
                            <div key={booking.id} className="py-4">
                              <div className="flex justify-between">
                                <div>
                                  <p className="font-medium">
                                    {booking.firstName} {booking.lastName}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    Room {booking.roomNum} - {formatDate(booking.checkInDate)} to {formatDate(booking.checkOutDate)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">Booking #{booking.id}</p>
                                  <p className="text-green-600">Valid</p>
                                </div>
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <p className="text-gray-600 text-center py-4">
                        No current bookings for this room type
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Room Update Confirmation Modal */}
      {showUpdateConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Room Reduction</h2>
            <p className="text-gray-600 mb-4">
              You are about to reduce the number of {managementRoomType} rooms from {currentRoomAmount} to {newRoomAmount}.
            </p>
            <p className="text-red-600 mb-6 font-medium">
              Warning: This may cancel recent reservations if there are currently more bookings than the new room amount.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUpdateConfirmation(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300"
              >
                Cancel
              </button>
              <button
                onClick={processRoomUpdate}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                Yes, Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Booking Details</h2>
              <button
                onClick={handleCloseDetails}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Booking Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Booking Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <p className={`font-medium ${
                      selectedBooking.status === 'Valid' ? 'text-green-600' :
                      selectedBooking.status === 'CANCELLED' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {selectedBooking.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking ID</p>
                    <p className="font-medium">#{selectedBooking.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Date</p>
                    <p className="font-medium">
                      {new Date(selectedBooking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Guest Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Guest Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">
                      {selectedBooking.firstName} {selectedBooking.lastName || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedBooking.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">User ID</p>
                    <p className="font-medium">{selectedBooking.userId}</p>
                  </div>
                </div>
              </div>

              {/* Hotel Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hotel Details</h3>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-lg">{selectedBooking.hotelName}</p>
                    <p className="text-gray-600">{selectedBooking.hotelDetails?.address || 'Address not available'}</p>
                    <p className="text-gray-600">{selectedBooking.hotelDetails?.location || 'Location not available'}</p>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{selectedBooking.roomType} - Room {selectedBooking.roomNum}</p>
                        <p className="flex items-center mt-2 text-sm text-gray-600">
                          <FaCalendarAlt className="mr-1" />
                          Check-in: {formatDate(selectedBooking.checkInDate)}
                        </p>
                        <p className="flex items-center mt-1 text-sm text-gray-600">
                          <FaCalendarAlt className="mr-1" />
                          Check-out: {formatDate(selectedBooking.checkOutDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Price per night</p>
                        <p className="font-medium">${selectedBooking.price}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total Price */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Stay</p>
                        <p className="font-medium">
                          {calculateNights(selectedBooking.checkInDate, selectedBooking.checkOutDate)} nights
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Price</p>
                        <p className="text-xl font-bold text-blue-600">
                          ${calculateTotalPrice(selectedBooking.price, selectedBooking.checkInDate, selectedBooking.checkOutDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleCloseDetails}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && bookingToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancel Booking</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel booking #{bookingToCancel.id} at {bookingToCancel.hotelName}?
            </p>
            <p className="text-gray-600 mb-6">
              Guest: <span className="font-medium">{bookingToCancel.firstName} {bookingToCancel.lastName || 'N/A'}</span>
            </p>
            <p className="text-gray-600 mb-6">
              Room: <span className="font-medium">{bookingToCancel.roomType} - Room {bookingToCancel.roomNum}</span>
            </p>
            <p className="text-red-600 mb-6">
              This action cannot be undone. The booking will be cancelled immediately.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-300"
              >
                No, Keep Booking
              </button>
              <button
                onClick={confirmCancelBooking}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                Yes, Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 
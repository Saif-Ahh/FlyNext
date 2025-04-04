// pages/hotel-bookings.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaHotel, FaCalendarAlt, FaBed, FaMapMarkerAlt, FaDownload, FaTimes, FaSearch } from 'react-icons/fa';

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
  hotelDetails?: Hotel;
  roomDetails?: HotelRoom;
}

interface BookingsResponse {
  bookings: Booking[];
}

export default function HotelBookings() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isClient, setIsClient] = useState(false);

  // Use useEffect to set isClient to true after component mounts
  useEffect(() => {
    setIsClient(true);
    
    // Load saved search term from localStorage
    const savedSearchTerm = localStorage.getItem('hotelBookingsSearchTerm');
    if (savedSearchTerm) {
      setSearchTerm(savedSearchTerm);
    }
  }, []);

  // Save search term to localStorage when it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('hotelBookingsSearchTerm', searchTerm);
    }
  }, [searchTerm, isClient]);

  // Filter bookings when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBookings(bookings);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = bookings.filter(booking => {
      // Check if booking id matches
      if (booking.id.toString().includes(term)) {
        return true;
      }
      
      // Check if hotel name or location matches
      if (booking.hotelName.toLowerCase().includes(term)) {
        return true;
      }
      
      // Check if location matches
      if (booking.hotelDetails?.location.toLowerCase().includes(term)) {
        return true;
      }
      
      return false;
    });
    
    setFilteredBookings(filtered);
  }, [searchTerm, bookings]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/hotels/retrieveHotelBookings', {
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
        setError('Failed to load your bookings. Please try again later.');
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
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/hotels/cancelBooking?hotelId=${bookingToCancel.hotelId}&bookingID=${bookingToCancel.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      // Update only the specific booking that was cancelled
      setBookings(bookings.map(booking => 
        booking.id === bookingToCancel.id
          ? { ...booking, status: 'CANCELLED' } 
          : booking
      ));

      setShowCancelModal(false);
      setBookingToCancel(null);
    } catch (error) {
      setError('Failed to cancel booking. Please try again later.');
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
        <title>My Hotel Bookings - FlyNext</title>
        <meta name="description" content="View and manage your hotel bookings" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
              <FaHotel className="mr-2" />
              Back to Home
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Hotel Bookings</h1>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by hotel name or location..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {filteredBookings.length} of {bookings.length} bookings found
            </p>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">No bookings found</h2>
              {searchTerm ? (
                <p className="text-gray-600 mb-6">No bookings match your search criteria. Try a different search term.</p>
              ) : (
                <p className="text-gray-600 mb-6">You don't have any hotel bookings yet.</p>
              )}
              <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300">
                Book a Hotel
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
                          {booking.hotelName}
                        </h3>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <FaMapMarkerAlt className="mr-1" />
                          <span>{booking.hotelDetails?.location || 'Location not available'}</span>
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
                          <h4 className="font-medium text-gray-900">{booking.roomType} - Room {booking.roomNum}</h4>
                          <p className="text-sm text-gray-500 mt-1">{booking.hotelDetails?.address || 'Address not available'}</p>
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
        </div>
      </div>

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
              {(selectedBooking.firstName || selectedBooking.lastName || selectedBooking.email) && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Guest Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {(selectedBooking.firstName || selectedBooking.lastName) && (
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">
                          {selectedBooking.firstName} {selectedBooking.lastName}
                        </p>
                      </div>
                    )}
                    {selectedBooking.email && (
                      <div>
                        <p className="text-sm text-gray-600">Email</p>
                        <p className="font-medium">{selectedBooking.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
              Are you sure you want to cancel your booking at {bookingToCancel.hotelName}?
            </p>
            <p className="text-gray-600 mb-6">
              Booking ID: <span className="font-medium">#{bookingToCancel.id}</span>
            </p>
            <p className="text-red-600 mb-6">
              This action cannot be undone. Your booking will be cancelled immediately.
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
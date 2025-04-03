//pages/flights-bookings.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { FaPlane, FaClock, FaChair, FaBuilding, FaGlobe, FaDownload, FaTimes, FaSearch } from 'react-icons/fa';

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

interface Booking {
  id: string;
  bookingReference: string;
  ticketNumber: string;
  status: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  passportNumber: string;
  flights: Flight[];
}

interface BookingsResponse {
  bookings: Booking[];
}

export default function FlightBookings() {
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
    const savedSearchTerm = localStorage.getItem('flightBookingsSearchTerm');
    if (savedSearchTerm) {
      setSearchTerm(savedSearchTerm);
    }
  }, []);

  // Save search term to localStorage when it changes
  useEffect(() => {
    if (isClient) {
      localStorage.setItem('flightBookingsSearchTerm', searchTerm);
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
      // Check if booking reference matches
      if (booking.bookingReference.toLowerCase().includes(term)) {
        return true;
      }
      
      // Check if any flight's origin or destination city matches
      return booking.flights.some(flight => 
        flight.origin.city.toLowerCase().includes(term) || 
        flight.destination.city.toLowerCase().includes(term)
      );
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

        const response = await fetch('/api/bookings/retrieveflightbooking', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data: BookingsResponse = await response.json();
        
        // Sort flights within each booking by departure time
        const sortedBookings = data.bookings.map(booking => ({
          ...booking,
          flights: [...booking.flights].sort((a, b) => 
            new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
          )
        }));
        
        // Sort bookings by the departure time of their first flight
        const sortedBookingsByDate = sortedBookings.sort((a, b) => 
          new Date(a.flights[0].departureTime).getTime() - new Date(b.flights[0].departureTime).getTime()
        );
        
        setBookings(sortedBookingsByDate);
        setFilteredBookings(sortedBookingsByDate);
      } catch (error) {
        setError('Failed to load your bookings. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [router]);

  const handleViewDetails = (booking: Booking) => {
    // Ensure flights are sorted when viewing details
    const sortedBooking = {
      ...booking,
      flights: [...booking.flights].sort((a, b) => 
        new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
      )
    };
    setSelectedBooking(sortedBooking);
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

      const response = await fetch(`/api/bookings/cancelflightbooking?bookingref=${bookingToCancel.bookingReference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      // Update only the specific booking that was cancelled
      setBookings(bookings.map(booking => 
        booking.bookingReference === bookingToCancel.bookingReference
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

      const response = await fetch(`/api/bookings/flightbookingpdf?bookingReference=${booking.bookingReference}`, {
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
      a.download = `invoice-${booking.bookingReference}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setError('Failed to download invoice. Please try again later.');
    }
  };

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
        <title>My Flight Bookings - FlyNext</title>
        <meta name="description" content="View and manage your flight bookings" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 flex items-center">
              <FaPlane className="mr-2" />
              Back to Home
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-8">My Flight Bookings</h1>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by city or booking reference..."
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
                <p className="text-gray-600 mb-6">You don't have any flight bookings yet.</p>
              )}
              <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-300">
                Book a Flight
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
                          {booking.flights[0].origin.city} ({booking.flights[0].origin.code}) →{' '}
                          {booking.flights[booking.flights.length - 1].destination.city} (
                          {booking.flights[booking.flights.length - 1].destination.code})
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(booking.flights[0].departureTime)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Booking Reference</p>
                        <p className="text-lg font-bold text-blue-600">{booking.bookingReference}</p>
                        <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                          booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      {booking.flights.map((flight, index) => (
                        <div key={`${booking.id}-${flight.id}`} className="mb-4">
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

                          {index < booking.flights.length - 1 && (
                            <div className="mt-2 text-sm text-gray-500">
                              <FaBuilding className="inline-block mr-1" />
                              {formatDuration(
                                (new Date(booking.flights[index + 1].departureTime).getTime() - 
                                new Date(flight.arrivalTime).getTime()) / (1000 * 60)
                              )} layover at {flight.destination.name} ({flight.destination.code})
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center text-gray-500">
                          <FaChair className="mr-1" />
                          <span>{booking.flights[0].availableSeats} seats left</span>
                        </div>
                        <div className="flex items-center text-gray-500">
                          <FaGlobe className="mr-1" />
                          <span>{booking.flights.length} {booking.flights.length === 1 ? 'leg' : 'legs'}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(booking)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300"
                        >
                          View Details
                        </button>
                        {booking.status === 'CONFIRMED' && (
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
                      selectedBooking.status === 'CONFIRMED' ? 'text-green-600' :
                      selectedBooking.status === 'CANCELLED' ? 'text-red-600' :
                      'text-yellow-600'
                    }`}>
                      {selectedBooking.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Reference</p>
                    <p className="font-medium">{selectedBooking.bookingReference}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ticket Number</p>
                    <p className="font-medium">{selectedBooking.ticketNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Booking Date</p>
                    <p className="font-medium">
                      {new Date(selectedBooking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Passenger Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Passenger Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">
                      {selectedBooking.firstName} {selectedBooking.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedBooking.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Passport Number</p>
                    <p className="font-medium">{selectedBooking.passportNumber}</p>
                  </div>
                </div>
              </div>

              {/* Flight Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Flight Details</h3>
                <div className="space-y-4">
                  {selectedBooking.flights.map((flight, index) => (
                    <div key={`${selectedBooking.id}-${flight.id}`} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{flight.airline.name} ({flight.flightNumber})</p>
                          <p className="text-sm text-gray-600">
                            {flight.origin.city} ({flight.origin.code}) → {flight.destination.city} ({flight.destination.code})
                          </p>
                        </div>
                        <p className="text-blue-600 font-medium">
                          {flight.currency} {flight.price}
                        </p>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <div>
                          <p>Departure: {formatDate(flight.departureTime)} at {formatTime(flight.departureTime)}</p>
                          <p>Arrival: {formatDate(flight.arrivalTime)} at {formatTime(flight.arrivalTime)}</p>
                        </div>
                        <p>Duration: {formatDuration(flight.duration)}</p>
                      </div>
                      {index < selectedBooking.flights.length - 1 && (
                        <div className="mt-2 text-sm text-gray-500">
                          <FaBuilding className="inline-block mr-1" />
                          {formatDuration(
                            (new Date(selectedBooking.flights[index + 1].departureTime).getTime() - 
                            new Date(flight.arrivalTime).getTime()) / (1000 * 60)
                          )} layover at {flight.destination.name} ({flight.destination.code})
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Total Travel Time and Price */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Total Travel Time</p>
                        <p className="font-medium">
                          {formatDuration(
                            selectedBooking.flights.reduce((total, flight) => total + flight.duration, 0)
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Price</p>
                        <p className="text-xl font-bold text-blue-600">
                          {selectedBooking.flights[0].currency} {selectedBooking.flights.reduce((total, flight) => total + flight.price, 0)}
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
              Are you sure you want to cancel your booking for {bookingToCancel.flights[0].origin.city} to {bookingToCancel.flights[bookingToCancel.flights.length - 1].destination.city}?
            </p>
            <p className="text-gray-600 mb-6">
              Booking Reference: <span className="font-medium">{bookingToCancel.bookingReference}</span>
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
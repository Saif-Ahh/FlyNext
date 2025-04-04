import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FaHotel, FaPlus, FaEdit, FaTrash, FaStar, FaMapMarkerAlt, FaBed, FaTimes, FaCalendarAlt } from 'react-icons/fa';
import Image from 'next/image';

interface Hotel {
  id: string;
  name: string;
  location: string;
  address: string;
  starRating: number;
  price?: number;
  pictures?: { link: string }[];
  images?: string[]; // Alternative format based on API design
}

interface NewRoom {
  hotelId: string;
  roomNum: string;
  name: string;
  amenities: string;
  pricePerNight: string;
  images: string;
}

export default function MyHotels() {
  const router = useRouter();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeHotelId, setActiveHotelId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState<NewRoom>({
    hotelId: '',
    roomNum: '',
    name: '',
    amenities: '',
    pricePerNight: '',
    images: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchHotels = async () => {
      try {
        const response = await fetch('/api/hotels/getMyHotels', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch hotels');
        }

        const data = await response.json();
        console.log("API Response:", data);
        
        setHotels(data.hotels);
      } catch (err) {
        setError('Failed to load hotels. Please try again later.');
        console.error('Error fetching hotels:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, [router]);

  const handleDelete = async (hotelId: string) => {
    if (!confirm('Are you sure you want to delete this hotel?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/hotels/${hotelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
          return;
        }
        throw new Error('Failed to delete hotel');
      }

      setHotels(hotels.filter(hotel => hotel.id !== hotelId));
    } catch (err) {
      setError('Failed to delete hotel. Please try again later.');
      console.error('Error deleting hotel:', err);
    }
  };

  // Function to get image URL from hotel object
  const getHotelImageUrl = (hotel: Hotel): string => {
    // Log to debug
    console.log(`Processing hotel ${hotel.name}:`, hotel);
    
    // Try pictures array first (pictures[0].link)
    if (hotel.pictures && hotel.pictures.length > 0 && hotel.pictures[0].link) {
      console.log(`Found image in pictures[0].link:`, hotel.pictures[0].link);
      return hotel.pictures[0].link;
    }
    
    // Try images array as fallback (images[0])
    if (hotel.images && hotel.images.length > 0) {
      console.log(`Found image in images[0]:`, hotel.images[0]);
      return hotel.images[0];
    }
    
    // Default image if none found
    console.log(`No image found for hotel ${hotel.name}`);
    return '/placeholder-hotel.jpg'; // Add a placeholder image to your public folder
  };

  const toggleAddRoomForm = (hotelId: string) => {
    if (activeHotelId === hotelId) {
      setActiveHotelId(null);
    } else {
      setActiveHotelId(hotelId);
      setNewRoom({
        hotelId,
        roomNum: '',
        name: '',
        amenities: '',
        pricePerNight: '',
        images: ''
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewRoom(prev => ({ ...prev, [name]: value }));
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/hotels/addRoomType', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          hotelId: newRoom.hotelId,
          roomNum: parseInt(newRoom.roomNum, 10),
          name: newRoom.name,
          amenities: newRoom.amenities.split(',').map(a => a.trim()),
          pricePerNight: parseFloat(newRoom.pricePerNight),
          images: newRoom.images.split(',').map(i => i.trim())
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Room added successfully!');
        setActiveHotelId(null);
        // Refresh the hotels list after adding a room
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(data.error || 'Failed to add room. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again later.');
      console.error('Error adding room:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to navigate to bookings page
  const handleViewBookings = (hotelId: string) => {
    router.push(`/my-hotels-bookings?hotelId=${hotelId}`);
  };

  // Show nothing until client-side hydration is complete
  if (!mounted) {
    return null;
  }

  return (
    <>
      <Head>
        <title>My Hotels - FlyNext</title>
        <meta name="description" content="Manage your hotels on FlyNext" />
      </Head>

      {/* Fixed positioned notification area */}
      {(error || success) && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4">
          <div className="max-w-md w-full">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg animate-bounce">
                <div className="flex justify-between items-center">
                  <p className="text-red-600">{error}</p>
                  <button 
                    onClick={() => setError(null)} 
                    className="text-red-400 hover:text-red-600"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-lg animate-bounce">
                <div className="flex justify-between items-center">
                  <p className="text-green-600">{success}</p>
                  <button 
                    onClick={() => setSuccess(null)} 
                    className="text-green-400 hover:text-green-600"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Hotels</h1>
            <Link
              href="/add-hotel"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaPlus className="mr-2" />
              Add Hotel
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : hotels.length === 0 ? (
            <div className="text-center py-12">
              <FaHotel className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hotels</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by adding a new hotel.</p>
              <div className="mt-6">
                <Link
                  href="/add-hotel"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FaPlus className="mr-2" />
                  Add Hotel
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hotels.map((hotel) => (
                <div key={hotel.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={getHotelImageUrl(hotel)}
                      alt={hotel.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(`Error loading image for ${hotel.name}`);
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-hotel.jpg'; // Fallback image
                      }}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">{hotel.name}</h3>
                      <div className="flex items-center">
                        <FaStar className="text-yellow-400 mr-1" />
                        <span className="text-gray-600">{hotel.starRating}</span>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center text-gray-600">
                      <FaMapMarkerAlt className="mr-1" />
                      <span>{hotel.location}</span>
                    </div>
                    <div className="mt-2 text-sm text-gray-600 truncate">
                      {hotel.address}
                    </div>
                    
                    {/* Updated buttons section with two buttons */}
                    <div className="mt-4 flex justify-end space-x-2">
                      <button
                        onClick={() => handleViewBookings(hotel.id)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FaCalendarAlt className="mr-1" />
                        View Bookings
                      </button>
                      <button
                        onClick={() => toggleAddRoomForm(hotel.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <FaBed className="mr-1" />
                        Add Room
                      </button>
                    </div>
                  </div>

                  {/* Room Addition Form */}
                  {activeHotelId === hotel.id && (
                    <div className="p-4 bg-gray-50 border-t">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">Add New Room</h4>
                        <button 
                          onClick={() => setActiveHotelId(null)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <FaTimes />
                        </button>
                      </div>
                      <form onSubmit={handleAddRoom}>
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                            <input
                              type="number"
                              name="roomNum"
                              value={newRoom.roomNum}
                              onChange={handleInputChange}
                              required
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="101"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                            <input
                              type="text"
                              name="name"
                              value={newRoom.name}
                              onChange={handleInputChange}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Deluxe"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Night</label>
                            <input
                              type="number"
                              name="pricePerNight"
                              value={newRoom.pricePerNight}
                              onChange={handleInputChange}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="100"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amenities (comma separated)</label>
                            <input
                              type="text"
                              name="amenities"
                              value={newRoom.amenities}
                              onChange={handleInputChange}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Wi-Fi, TV, Air Conditioning"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Images URLs (comma separated)</label>
                            <input
                              type="text"
                              name="images"
                              value={newRoom.images}
                              onChange={handleInputChange}
                              required
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                              placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                            />
                          </div>
                          <div className="mt-2">
                      <button
                              type="submit"
                              disabled={isSubmitting}
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                              {isSubmitting ? 'Adding...' : 'Add Room'}
                      </button>
                    </div>
                  </div>
                      </form>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 
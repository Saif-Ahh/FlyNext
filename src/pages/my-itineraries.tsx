// pages/my-itineraries.tsx
// @ts-nocheck
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaPlane, FaHotel, FaCalendarAlt, FaChevronDown, FaChevronUp, FaDownload, FaTimes } from 'react-icons/fa';

export default function MyItinerariesPage() {
  const [itineraries, setItineraries] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchItineraries = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to view your itineraries.');
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/itineraries/retrieveall', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Unknown error');
      }

      const data = await res.json();
      setItineraries(data.itineraries || []);
    } catch (err) {
      console.error('Error fetching itineraries:', err);
      alert('Error fetching your itineraries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItineraries();
  }, [router]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const downloadPdf = async (id: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/itineraries/pdf?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `itinerary-${id}.pdf`;
      a.click();
    } catch (err) {
      alert('Failed to download itinerary PDF');
    }
  };

  const cancelPart = async (itineraryId: string, type: 'flight' | 'hotel') => {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please login.');

    const itinerary = itineraries.find(i => i.id === itineraryId);
    const hotelExists = itinerary?.hotelBooking != null;
    const flightExists = itinerary?.flightBooking != null;

    console.log("Cancel attempt:", { itineraryId, type, hotelExists, flightExists });

    let url = `/api/itineraries/update?itineraryId=${itineraryId}`;
    if (type === 'flight') {
      url += `&flightBookingRef=delete`;
    } else {
      url += `&hotelBookingRef=delete`;
    }

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      console.log("Cancel API response:", data);

      if (!res.ok) throw new Error(data.error || 'Unknown error occurred');

      if (data.message?.includes('Itinerary deleted')) {
        alert('Entire itinerary deleted as both bookings were removed.');
      } else {
        alert(`${type === 'flight' ? 'Flight' : 'Hotel'} booking canceled.`);
      }
      fetchItineraries(); // refresh updated list
    } catch (err) {
      console.error('Error canceling booking:', err);
      alert(`Failed to cancel ${type} booking.`);
    }
  };

  return (
    <>
      <Head>
        <title>My Itineraries - FlyNext</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-center mb-8">My Itineraries</h1>

        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : itineraries.length === 0 ? (
          <div className="text-center text-gray-500">No confirmed itineraries found.</div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {itineraries.map((itinerary, index) => {
              const hotel = itinerary.hotelBooking;
              const flight = itinerary.flightBooking;
              const summary = [];

              if (flight) {
                const from = flight.flights[0]?.origin?.city;
                const to = flight.flights[flight.flights.length - 1]?.destination?.city;
                summary.push(`${from} → ${to}`);
              }

              if (hotel) {
                summary.push(`Hotel: ${hotel.hotel?.name || 'N/A'}`);
              }

              return (
                <div key={itinerary.id} className="bg-white shadow-lg rounded-lg overflow-hidden">
                  <div className="flex justify-between items-center px-6 py-4 border-b bg-gray-100">
                    <div>
                      <h2 className="text-xl font-semibold text-blue-600">Itinerary #{index + 1}</h2>
                      <p className="text-sm text-gray-600">{summary.join(' | ')}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button onClick={() => downloadPdf(itinerary.id)} title="Download PDF" className="text-blue-600 hover:text-blue-800">
                        <FaDownload />
                      </button>
                      <button onClick={() => toggleExpand(itinerary.id)} className="text-gray-600 hover:text-black">
                        {expanded[itinerary.id] ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </div>
                  </div>

                  {expanded[itinerary.id] && (
                    <div className="px-6 py-4 space-y-4 bg-white">
                      {hotel && (
                        <div className="border rounded p-4 bg-blue-50">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FaHotel /> Hotel Booking
                          </h3>
                          <p>Hotel: {hotel.hotel?.name || 'N/A'}</p>
                          <p>Room: {hotel.roomType} #{hotel.roomNum}</p>
                          <p>Check-in: {new Date(hotel.checkIn).toLocaleDateString()}</p>
                          <p>Check-out: {new Date(hotel.checkOut).toLocaleDateString()}</p>
                          <p>Reference: {hotel.id}</p>
                          <button
                            onClick={() => cancelPart(itinerary.id, 'hotel')}
                            className="mt-2 inline-flex items-center px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
                          >
                            <FaTimes className="mr-1" />
                            Cancel Hotel
                          </button>
                        </div>
                      )}
                      {flight && (
                        <div className="border rounded p-4 bg-green-50">
                          <h3 className="text-lg font-semibold flex items-center gap-2">
                            <FaPlane /> Flight Booking
                          </h3>
                          <p>Route: {flight.flights[0]?.origin?.city} → {flight.flights[flight.flights.length - 1]?.destination?.city}</p>
                          <p>Date: {new Date(flight.flights[0]?.departureTime).toLocaleDateString()}</p>
                          <p>Reference: {flight.id}</p>
                          <button
                            onClick={() => cancelPart(itinerary.id, 'flight')}
                            className="mt-2 inline-flex items-center px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
                          >
                            <FaTimes className="mr-1" />
                            Cancel Flight
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

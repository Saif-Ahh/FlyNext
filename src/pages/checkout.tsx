// pages/checkout.tsx
// @ts-nocheck
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { FaPlane, FaHotel, FaTrash, FaCalendarAlt } from 'react-icons/fa';

export default function CheckoutPage() {
  const [cart, setCart] = useState([]);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [cardError, setCardError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    setCart(savedCart);
  }, []);

  const removeItem = (indexToRemove: number) => {
    const itemToRemove = cart[indexToRemove];
    const updatedCart = cart.filter((_, i) => i !== indexToRemove);
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    if (itemToRemove.type === 'one-way') localStorage.removeItem('flightBookingReference');
    else if (itemToRemove.type === 'hotel') localStorage.removeItem('hotelBookingReference');
  };

  const validateCard = () => {
    const cardRegex = /^[0-9]{16}$/;
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    const pinRegex = /^[0-9]{3}$/;
    if (!cardRegex.test(cardNumber)) {
      setCardError('Invalid card number. Must be 16 digits.');
      return false;
    }
    if (!expiryRegex.test(expiryDate)) {
      setCardError('Invalid expiry date. Use MM/YY format.');
      return false;
    }
    if (!pinRegex.test(cardPin)) {
      setCardError('Invalid PIN. Must be 3 digits.');
      return false;
    }
    setCardError('');
    return true;
  };

  const validateWithAPI = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to proceed');
      router.push('/login');
      return false;
    }

    try {
      const res = await fetch('/api/auth/cardvalidation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cardNumber,
          pin: cardPin,
          expirationDate: new Date(`20${expiryDate.slice(3)}`, Number(expiryDate.slice(0, 2)) - 1, 1),
        }),
      });

      const data = await res.json();
      console.log('Card validation response:', data);

      if (!res.ok) {
        alert(data.error || 'Card validation failed');
        return false;
      }

      return true;
    } catch (err) {
      console.error('Card validation error:', err);
      alert('Error validating card');
      return false;
    }
  };

  const confirmItinerary = async () => {
    console.log('Initiating itinerary confirmation...');

    if (!validateCard()) return;
    const isCardValid = await validateWithAPI();
    if (!isCardValid) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please login to proceed');
      router.push('/login');
      return;
    }

    const hotelItem = cart.find(i => i.type === 'hotel');
    const flightItem = cart.find(i => i.type === 'one-way');

    const hotelRef = hotelItem?.bookingReference?.toString() ?? null;
    const flightRef = flightItem?.bookingReference?.toString() ?? null;

    console.log('Submitting itinerary with:', {
      hotelRef,
      flightRef,
      hotelItem,
      flightItem,
      cart,
    });

    if (!hotelRef && !flightRef) {
      alert('You must have at least one hotel or flight in your cart.');
      return;
    }

    try {
      const res = await fetch('/api/itineraries/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...(hotelRef ? { hotelBookingRef: hotelRef } : {}),
          ...(flightRef ? { flightBookingRef: flightRef } : {}),
        }),
      });

      const data = await res.json();
      console.log('Itinerary API response:', data);

      if (!res.ok) throw new Error(data.error || 'Failed to confirm itinerary');

      alert('Itinerary confirmed!');
      localStorage.removeItem('cart');
      localStorage.removeItem('flightBookingReference');
      localStorage.removeItem('hotelBookingReference');
      router.push('/my-itineraries');
    } catch (err) {
      console.error('Error during itinerary confirmation:', err);
      alert('Error confirming itinerary');
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      if (item.type === 'one-way') return total + (item.totalPrice || 0);
      if (item.type === 'hotel') {
        const nights = (new Date(item.checkOutDate).getTime() - new Date(item.checkInDate).getTime()) / (1000 * 60 * 60 * 24);
        return total + ((item.room?.pricePerNight || 0) * nights);
      }
      return total;
    }, 0);
  };

  return (
    <>
      <Head>
        <title>Checkout - FlyNext</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">Your Cart</h1>

        {cart.length === 0 ? (
          <div className="text-center text-gray-600">
            Your cart is empty. <Link href="/" className="text-blue-600">Return to search</Link>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {cart.map((item, index) => (
              <div key={index} className="bg-white shadow rounded-lg p-4 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    {item.type === 'hotel' ? <FaHotel /> : <FaPlane />}
                    {item.type === 'hotel'
                      ? item.hotelName
                      : item.flight.flights[0]?.origin?.city + ' to ' + item.flight.flights[item.flight.flights.length - 1]?.destination?.city}
                  </h2>
                  <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                    <FaTrash />
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  <p>
                    <FaCalendarAlt className="inline mr-1" />
                    {new Date(item.checkInDate).toLocaleDateString()} → {new Date(item.checkOutDate).toLocaleDateString()}
                  </p>

                  {item.type === 'hotel' && (
                    <>
                      <p>Room: {item.room?.name} #{item.room?.roomNum}</p>
                      <p>Price: ${item.room?.pricePerNight}/night</p>
                    </>
                  )}

                  {item.type === 'one-way' && (
                    <p>Total Price: ${item.totalPrice}</p>
                  )}

                  <p className="mt-1 text-xs text-gray-500">Ref: {item.bookingReference}</p>
                </div>
              </div>
            ))}

            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-2">Total Price</h2>
              <p className="text-2xl font-bold text-blue-600">${getTotalPrice().toFixed(2)}</p>
            </div>

            <div className="bg-white shadow rounded-lg p-4 space-y-4">
              <h2 className="text-lg font-semibold">Payment Details</h2>
              <input
                type="text"
                placeholder="Card Number (16 digits)"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Expiry Date (MM/YY)"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="PIN (3 digits)"
                value={cardPin}
                onChange={(e) => setCardPin(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              {cardError && <p className="text-red-600 text-sm">{cardError}</p>}
            </div>

            <div className="text-center">
              <button
                onClick={confirmItinerary}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
              >
                Confirm Itinerary
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { faker } from '@faker-js/faker';
import fs from 'fs';
import fetch from 'node-fetch';

const apiKey = process.env.AFS_API_KEY || 'your-api-key';

async function generateHotels() {
  try {
    const res = await fetch('https://advanced-flights-system.replit.app/api/cities', {
      method: 'GET',
      headers: {
        'x-api-key': apiKey
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch cities: ${res.statusText}`);
    }

    const citiesData = await res.json() as { city: string; country: string }[];
    const cityNames = citiesData.map(c => c.city);

    const starRatings = [3, 4, 5];
    const hotels = [];

    for (let i = 0; i < 50; i++) {
      const city = faker.helpers.arrayElement(cityNames);
      const hotelName = `${faker.company.name()} Hotel`;
      const numRooms = faker.number.int({ min: 5, max: 10 });

      const rooms = [];
      for (let r = 1; r <= numRooms; r++) {
        const roomImages = Array.from({ length: faker.number.int({ min: 3, max: 5 }) }, () =>
          faker.image.urlLoremFlickr({ category: 'hotel-room' })
        );

        rooms.push({
          roomNum: r,
          name: faker.helpers.arrayElement(['Standard', 'Deluxe', 'Suite']),
          pricePerNight: parseFloat(faker.finance.amount({ min: 80, max: 400 })),
          amenities: faker.helpers.arrayElements(
            ['WiFi', 'TV', 'Pool', 'Gym', 'Breakfast', 'Air Conditioning', 'Room Service'],
            faker.number.int({ min: 2, max: 5 })
          ),
          images: roomImages
        });
      }

      const hotelImages = Array.from({ length: faker.number.int({ min: 3, max: 5 }) }, () =>
        faker.image.urlLoremFlickr({ category: 'hotel' })
      );

      hotels.push({
        userId: 'seed-user-id',
        name: hotelName,
        logo: faker.image.avatar(),
        address: faker.location.streetAddress(),
        location: city,
        starRating: faker.helpers.arrayElement(starRatings),
        images: hotelImages,
        rooms
      });
    }

    fs.writeFileSync('scripts/hotelData.json', JSON.stringify(hotels, null, 2));
    console.log('✅ 50 hotels with multiple images generated!');
  } catch (error) {
    console.error('❌ Error generating hotels:', error);
  }
}

generateHotels();
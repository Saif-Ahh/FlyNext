import prisma from '@/utils/prismaClient';
const hotelData = require('./hotelData.json');

async function importHotels() {
  try {
    // 1. Create the seed user (if not already exists)
    await prisma.user.upsert({
      where: { id: 'seed-user-id' },
      update: {},
      create: {
        id: 'seed-user-id',
        firstName: 'Seed',
        lastName: 'User',
        email: 'seed@example.com',
        password: 'dummy-password',
        profilePicture: '',
        phoneNumber: '123-456-7890',
        passportNumber: 'X1234567',
        bookingReferences: [],
        hotelBookings: []
      }
    });

    // 2. Import hotels with rooms
    for (const hotel of hotelData) {
      const createdHotel = await prisma.hotel.create({
        data: {
          userId: hotel.userId,
          name: hotel.name,
          logo: hotel.logo,
          address: hotel.address,
          location: hotel.location,
          starRating: hotel.starRating,
          images: hotel.images,
          rooms: {
            create: hotel.rooms.map((room: any) => ({
              roomNum: room.roomNum,
              name: room.name,
              pricePerNight: room.pricePerNight,
              amenities: room.amenities,
              images: room.images
            }))
          }
        }
      });

      console.log(`✅ Inserted hotel: ${createdHotel.name}`);
    }

    console.log('🎉 All hotels imported successfully!');
  } catch (error) {
    console.error('❌ Error importing hotels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importHotels();

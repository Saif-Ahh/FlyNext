// /api/itineraries/pdf.ts
// @ts-nocheck
import { NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { authMiddleware } from '@/middleware/authMiddleware';
import { AuthenticatedRequest } from '@/middleware/authMiddleware';
// @ts-ignore
import { getBookingById } from '@/controllers/hotelController';
import { retrieveBooking } from '@/services/flightService';

const prisma = new PrismaClient();

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized. User information missing.' });
  }

  const { id: itineraryId } = req.query;

  if (!itineraryId || typeof itineraryId !== 'string') {
    return res.status(400).json({ error: 'Itinerary ID is required and must be a string.' });
  }

  try {
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: itineraryId },
    });

    if (!itinerary) {
      return res.status(404).json({ error: 'Itinerary not found.' });
    }

    if (itinerary.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden. You are not the owner of this itinerary.' });
    }

    let flightBooking = null;
    let hotelBooking = null;

    if (itinerary.flightBookingRef) {
      const flightResult = await retrieveBooking(
        process.env.AFS_API_KEY!,
        req.user.lastName,
        itinerary.flightBookingRef
      );

      flightBooking = {
        ...flightResult,
        id: itinerary.flightBookingRef
      };
    }

    if (itinerary.hotelBookingRef) {
      hotelBooking = await getBookingById(parseInt(itinerary.hotelBookingRef, 10));
    }

    if (!flightBooking && !hotelBooking) {
      return res.status(404).json({ error: 'No bookings found for this itinerary.' });
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 400]);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yOffset = 350;

    // Add title
    page.drawText('Itinerary Details', {
      x: 50,
      y: yOffset,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    yOffset -= 30;

    let totalFlightPrice = 0;

    // Add flight details (if available)
    if (flightBooking && !('error' in flightBooking)) {
      page.drawText('Flight Details:', {
        x: 50,
        y: yOffset,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yOffset -= 20;

      for (const flight of flightBooking.flights) {
        page.drawText(`Airline: ${flight.airline.name} (${flight.flightNumber})`, {
          x: 50,
          y: yOffset,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        yOffset -= 15;

        page.drawText(`Departure: ${flight.origin.city} (${flight.origin.code}) at ${new Date(flight.departureTime).toLocaleString()}`, {
          x: 50,
          y: yOffset,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        yOffset -= 15;

        page.drawText(`Arrival: ${flight.destination.city} (${flight.destination.code}) at ${new Date(flight.arrivalTime).toLocaleString()}`, {
          x: 50,
          y: yOffset,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        yOffset -= 15;

        page.drawText(`Price: ${flight.price} ${flight.currency}`, {
          x: 50,
          y: yOffset,
          size: 12,
          font,
          color: rgb(0, 0, 0),
        });
        yOffset -= 30;

        totalFlightPrice += flight.price;
      }

      // Add flight booking reference
      page.drawText(`Reference: ${flightBooking.id}`, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yOffset -= 30;
    }

    // Add hotel details (if available)
    if (hotelBooking) {
      page.drawText('Hotel Details:', {
        x: 50,
        y: yOffset,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yOffset -= 20;

      page.drawText(`Hotel: ${hotelBooking.hotelName}`, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yOffset -= 15;

      page.drawText(`Room Type: ${hotelBooking.roomType}`, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yOffset -= 15;

      page.drawText(`Check-In: ${new Date(hotelBooking.checkInDate).toLocaleString()}`, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yOffset -= 15;

      page.drawText(`Check-Out: ${new Date(hotelBooking.checkOutDate).toLocaleString()}`, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yOffset -= 15;

      page.drawText(`Price: ${hotelBooking.price} USD`, {
        x: 50,
        y: yOffset,
        size: 12,
        font,
        color: rgb(0, 0, 0),
      });
      yOffset -= 30;
    }

    // Add combined price if both bookings exist
    if (flightBooking && hotelBooking) {
      const totalPrice = totalFlightPrice + parseFloat(hotelBooking.price);
      page.drawText(`Total Price: ${totalPrice.toFixed(2)} ${flightBooking.flights[0].currency}`, {
        x: 50,
        y: yOffset,
        size: 14,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
    }

    // Save the PDF and return it as a Buffer
    const pdfBytes = await pdfDoc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="itinerary-${itineraryId}.pdf"`);

    return res.status(200).send(pdfBuffer);
  } catch (error: any) {
    console.error('Error generating itinerary PDF:', error.message);
    return res.status(500).json({ error: `Failed to generate itinerary PDF: ${error.message}` });
  }
}

export default authMiddleware(handler);

import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { NextApiResponse } from 'next';
import { cancelflightcontroller } from '@/controllers/bookingController';
import { authMiddleware } from '@/middleware/authMiddleware';
import { getUserById, updateUser } from '@/services/userService';
//aided by chatgpt
async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        return res.status(405).json({ error: "Method not allowed. Use GET." });

    }

    console.log('Request User:', req.user);

    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized. User information missing.' });
    }

    const { userId } = req.user;
    // print userId to console
    console.log('User ID:', userId);

    const { bookingref } = req.query; 

    if (!bookingref || typeof bookingref !== "string") {
    return res.status(400).json({ error: "Missing or invalid required field: bookingref" });
    }

     // ensure tht the user has the given bookingref in their bookings using prisma
     const user = await getUserById(userId);
     if (!user) {
         return res.status(404).json({ error: "User not found" });    
     }
     const bookingReferences = user.bookingReferences || [];
     // @ts-ignore
     if (!bookingReferences.includes(bookingref)) {
         return res.status(404).json({ error: "Booking reference not found" });
     }
 


    try {
        const bookingResult = await cancelflightcontroller(req.user.lastName, bookingref, req.user.userId);


        if ("error" in bookingResult) {
            return res.status(400).json({ error: bookingResult.error });
        }
        // update the user's booking references in the database to remove the cancelled booking reference
        // @ts-ignore
        // const updatedBookingReferences = bookingReferences.filter(ref => ref !== bookingref);
        // await updateUser(userId, { bookingReferences: updatedBookingReferences });

        res.status(200).json(bookingResult);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}

export default authMiddleware(handler);
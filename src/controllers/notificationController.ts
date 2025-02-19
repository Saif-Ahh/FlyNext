import { NextApiResponse } from 'next';
import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { getNotificationsForUser } from '@/services/notificationService';

export async function getNotificationsController(req: AuthenticatedRequest, res: NextApiResponse) {
    try {
        const userId = (req.user as any).userId;
        const notifications = await getNotificationsForUser(userId);
        res.status(200).json({ notifications });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Error fetching notifications' });
    }
}


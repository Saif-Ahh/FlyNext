import { NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedRequest } from '@/middleware/authMiddleware';
import { 
    createNotification, 
    getNotificationsForUser, 
    markNotificationAsRead, 
    getUnreadNotificationCount 
} from '@/services/notificationService';

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

export async function markNotificationAsReadController(req: AuthenticatedRequest, res: NextApiResponse) {
    try {
        const { notificationId } = req.body;
        await markNotificationAsRead(notificationId);
        res.status(200).json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Error marking notification as read' });
    }
}

export async function getUnreadNotificationCountController(req: AuthenticatedRequest, res: NextApiResponse) {
    try {
        const userId = (req.user as any).userId;
        const count = await getUnreadNotificationCount(userId);
        res.status(200).json({ unreadCount: count });
    } catch (error) {
        console.error('Error getting unread notification count:', error);
        res.status(500).json({ error: 'Error getting unread notification count' });
    }
}
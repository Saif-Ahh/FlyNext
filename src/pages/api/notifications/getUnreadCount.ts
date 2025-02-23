import { getUnreadNotificationCountController } from '@/controllers/notificationController';
import { authMiddleware } from '@/middleware/authMiddleware';

export default authMiddleware(getUnreadNotificationCountController);
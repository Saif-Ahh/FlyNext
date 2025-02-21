import { markNotificationAsReadController } from '@/controllers/notificationController';
import { authMiddleware } from '@/middleware/authMiddleware';

export default authMiddleware(markNotificationAsReadController);
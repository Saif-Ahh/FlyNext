import prisma from '@/utils/prismaClient';

export async function createNotification(userId: string, message: string, hotelId?: string) {
    return await prisma.notification.create({
        data: { userId, message, hotelId }
    });
}

export async function getNotificationsForUser(userId: string) {
    return await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
    });
}

export async function markNotificationAsRead(notificationId: string) {
    return await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    });
}

export async function getUnreadNotificationCount(userId: string) {
    return await prisma.notification.count({
        where: { userId, isRead: false }
    });
}
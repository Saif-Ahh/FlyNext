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


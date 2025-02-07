import prisma from '@/utils/prismaClient';

export async function createUser(userData: any) {
    return prisma.user.create({ data: userData });
}

export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
}


import prisma from '@/utils/prismaClient';
import bcrypt from 'bcrypt';

export async function createUser(userData: any) {
    return prisma.user.create({ data: userData });
}

export async function findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
}

export async function validatePassword(plainPassword: string, hashedPassword: string) {
    return bcrypt.compare(plainPassword, hashedPassword);
}

export async function getUserById(userId: string) {
    return await prisma.user.findUnique({ where: { id: userId } });
}


import { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '@/services/userService';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function signupController(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { firstName, lastName, email, password, profilePicture, phoneNumber, passportNumber } = req.body;

        if (!firstName || !lastName || !email || !password || !phoneNumber || !passportNumber) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await createUser({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            profilePicture: profilePicture || 'default-profile.jpg',
            phoneNumber,
            passportNumber
        });

        return res.status(200).json({ message: 'User created successfully', user });
    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).json({ error: 'Error creating user' });
    }
}


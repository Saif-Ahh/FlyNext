import { NextApiRequest, NextApiResponse } from 'next';
import { createUser, findUserByEmail, validatePassword, getUserById } from '@/services/userService';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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

export async function loginController(req: NextApiRequest, res: NextApiResponse) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await validatePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                profilePicture: user.profilePicture,
                phoneNumber: user.phoneNumber,
                passportNumber: user.passportNumber,
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return res.status(200).json({ message: 'Login successful', token });
    } catch (error) {
        console.error('Error logging in:', error);
        return res.status(500).json({ error: 'Error logging in' });
    }
}

export async function logoutController(req: NextApiRequest, res: NextApiResponse) {
    try {
        res.setHeader('Set-Cookie', 'token=; HttpOnly; Max-Age=0; Path=/');
        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error during logout:', error);
        return res.status(500).json({ error: 'Error during logout' });
    }
}

export async function getProfileController(req: NextApiRequest, res: NextApiResponse) {
    try {
        const userId = (req as any).user.userId;
        const user = await getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({ error: 'Error fetching profile' });
    }
}


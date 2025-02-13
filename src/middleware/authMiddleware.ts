import { NextApiRequest, NextApiResponse } from 'next';
import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

export interface AuthenticatedRequest extends NextApiRequest {
    user?: {
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        profilePicture: string;
        phoneNumber: string;
        passportNumber: string;
    };
}

export function authMiddleware(handler: Function) {
    return async (req: AuthenticatedRequest, res: NextApiResponse) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedRequest['user'];
            req.user = decoded;
            return await handler(req, res);
        } catch (error) {
            // @ts-ignore
            console.error('JWT Verification Error:', error.message);
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    };
}

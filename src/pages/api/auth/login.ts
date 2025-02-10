import { loginController } from '@/controllers/authController';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return await loginController(req, res);
}
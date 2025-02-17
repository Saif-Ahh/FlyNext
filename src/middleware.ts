// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    const { method, nextUrl } = req;

    if (nextUrl.pathname.startsWith('/api/protected')) {
        const token = req.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    if (method === 'POST' && req.headers.get('content-type')?.includes('application/json')) {
        try {
            await req.json();
        } catch {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/api/:path*'],
};

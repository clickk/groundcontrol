import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth-service';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const user = await authService.verifyToken(token);

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}


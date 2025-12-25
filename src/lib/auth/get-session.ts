import { NextRequest } from 'next/server';
import { authService } from './auth-service';

export interface Session {
  user: {
    id: string;
    email: string;
    name: string;
  };
}

export async function getServerSession(request: NextRequest): Promise<Session | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Try to get token from cookies
      const token = request.cookies.get('token')?.value;
      if (!token) {
        return null;
      }
      
      const user = await authService.verifyToken(token);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      };
    }

    const token = authHeader.substring(7);
    const user = await authService.verifyToken(token);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    };
  } catch (error) {
    return null;
  }
}


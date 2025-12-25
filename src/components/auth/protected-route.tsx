'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      router.push('/login');
      return;
    }

    fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
          router.push('/login');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/login');
      });
  }, [router]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}


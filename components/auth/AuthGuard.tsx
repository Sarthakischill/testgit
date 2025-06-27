'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        if (data.isLoggedIn) {
          setIsAuth(true);
        } else {
          router.replace('/login');
        }
      } catch (error) {
        console.error('Failed to fetch auth status', error);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Skeleton className="w-1/2 h-1/2" />
      </div>
    );
  }

  if (!isAuth) {
    return null;
  }

  return <>{children}</>;
} 
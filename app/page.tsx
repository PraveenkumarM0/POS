'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function Home() {
  const { isAdmin, isCook } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAdmin) router.replace('/admin');
    else if (isCook) router.replace('/kds');
    else router.replace('/menu');
  }, [isAdmin, isCook, router]);

  return null;
}

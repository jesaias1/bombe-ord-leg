
import { useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';

// Create a guest user interface that matches Supabase User structure
interface GuestUser extends Partial<User> {
  id: string;
  isGuest: boolean;
  user_metadata: {
    display_name: string;
  };
  email?: string;
  aud: string;
  role?: string;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, any>;
}

export const useGuestAuth = () => {
  const [guestUser, setGuestUser] = useState<GuestUser | null>(() => {
    // Check if there's a stored guest user
    const stored = localStorage.getItem('guest_user');
    return stored ? JSON.parse(stored) : null;
  });

  const createGuestUser = useCallback((displayName: string): GuestUser => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const guest: GuestUser = {
      id: guestId,
      isGuest: true,
      user_metadata: {
        display_name: displayName
      },
      aud: 'authenticated',
      created_at: now,
      updated_at: now,
      app_metadata: {}
    };

    setGuestUser(guest);
    localStorage.setItem('guest_user', JSON.stringify(guest));
    return guest;
  }, []);

  const signInAsGuest = useCallback((displayName: string) => {
    return createGuestUser(displayName);
  }, [createGuestUser]);

  const signOutGuest = useCallback(() => {
    setGuestUser(null);
    localStorage.removeItem('guest_user');
  }, []);

  return {
    guestUser,
    signInAsGuest,
    signOutGuest,
    isGuest: !!guestUser
  };
};

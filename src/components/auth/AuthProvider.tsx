
import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface GuestUser {
  id: string;
  user_metadata: {
    display_name: string;
  };
  email?: string;
  isGuest: true;
}

interface AuthContextType {
  user: User | GuestUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  signInAsGuest: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for guest user in localStorage first
    const guestUser = localStorage.getItem('guest_user');
    if (guestUser) {
      try {
        const parsedGuestUser = JSON.parse(guestUser);
        console.log('Found guest user in localStorage:', parsedGuestUser);
        setUser(parsedGuestUser);
      } catch (error) {
        console.error('Error parsing guest user:', error);
        localStorage.removeItem('guest_user');
      }
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log('Found authenticated user:', session.user);
        setUser(session.user);
        // Clear guest user if real user logs in
        localStorage.removeItem('guest_user');
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        console.log('Auth state changed - authenticated user:', session.user);
        setUser(session.user);
        // Clear guest user if real user logs in
        localStorage.removeItem('guest_user');
      } else {
        // Check for guest user when no real session
        const guestUser = localStorage.getItem('guest_user');
        if (guestUser) {
          try {
            const parsedGuestUser = JSON.parse(guestUser);
            console.log('Auth state changed - using guest user:', parsedGuestUser);
            setUser(parsedGuestUser);
          } catch (error) {
            console.error('Error parsing guest user:', error);
            localStorage.removeItem('guest_user');
            setUser(null);
          }
        } else {
          console.log('Auth state changed - no user');
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Clear guest user when signing in with real account
      localStorage.removeItem('guest_user');
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Unexpected sign in error:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { error };
      }
      
      return { error: null };
    } catch (error) {
      console.error('Unexpected sign up error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    // Clear guest user
    localStorage.removeItem('guest_user');
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const signInAsGuest = async (displayName: string) => {
    const guestUser: GuestUser = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_metadata: {
        display_name: displayName
      },
      isGuest: true
    };
    
    console.log('Creating guest user:', guestUser);
    localStorage.setItem('guest_user', JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

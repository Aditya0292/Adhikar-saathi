import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { api } from '../api/client';

export interface User {
  id: string;
  auth_id: string;
  email: string;
  preferred_language: string;
  subscription_tier: string;
}

export interface Lawyer {
  id: string;
  auth_id: string;
  full_name: string;
  email: string;
  is_verified: boolean;
  verification_status: string;
  rejection_reason?: string;
}

interface AuthState {
  user: User | null;
  lawyer: Lawyer | null;
  session: Session | null;
  role: 'user' | 'lawyer' | 'admin' | null;
  isLoading: boolean;
  isVerifiedLawyer: boolean;
  
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  lawyer: null,
  session: null,
  role: null,
  isLoading: true,
  isVerifiedLawyer: false,

  setSession: (session) => {
    set({ session });
    if (session) {
      const userRole = session.user.app_metadata?.user_role || session.user.user_metadata?.role;
      set({ role: userRole as 'user' | 'lawyer' | 'admin' });
    } else {
      set({ user: null, lawyer: null, role: null, isVerifiedLawyer: false });
    }
  },

  fetchProfile: async () => {
    const { role } = get();
    try {
      if (role === 'user' || role === 'admin') {
        const data = await api.get('/api/v1/users/me');
        set({ user: data });
      } else if (role === 'lawyer') {
        const data = await api.get('/api/v1/lawyers/me/status');
        set({
          lawyer: data,
          isVerifiedLawyer: data.is_verified,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, lawyer: null, session: null, role: null, isVerifiedLawyer: false });
  },
}));

// Initialize auth state
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.getState().setSession(session);
  if (session) {
    useAuthStore.getState().fetchProfile();
  } else {
    useAuthStore.setState({ isLoading: false });
  }
});

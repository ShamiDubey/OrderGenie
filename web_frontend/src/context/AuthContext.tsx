'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FaceProfile } from '@/types';

interface AuthContextType {
  user: FaceProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (profile: FaceProfile) => void;
  logout: () => void;
  loginAsAdmin: (password: string) => boolean;
  logoutAdmin: () => void;
  updateUserPoints: (points: number) => void;
  setUserTotalPoints: (points: number) => void;
  updateUser: (updates: Partial<FaceProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PASSWORD = '123';
const USER_STORAGE_KEY = 'ai_order_user';
const ADMIN_STORAGE_KEY = 'ai_order_admin';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FaceProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem(USER_STORAGE_KEY);
      const storedAdmin = localStorage.getItem(ADMIN_STORAGE_KEY);

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      if (storedAdmin === 'true') {
        setIsAdmin(true);
      }
    } catch (error) {
      console.error('Error loading auth state:', error);
    }
    setIsLoaded(true);
  }, []);

  const login = (profile: FaceProfile) => {
    setUser(profile);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const loginAsAdmin = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      localStorage.setItem(ADMIN_STORAGE_KEY, 'true');
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  };

  const updateUserPoints = (pointsToAdd: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        totalPoints: (user.totalPoints || 0) + pointsToAdd,
      };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  const setUserTotalPoints = (totalPoints: number) => {
    if (user) {
      const updatedUser = {
        ...user,
        totalPoints,
      };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  const updateUser = (updates: Partial<FaceProfile>) => {
    if (user) {
      const updatedUser = {
        ...user,
        ...updates,
      };
      setUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }
  };

  // Don't render children until we've loaded from localStorage
  if (!isLoaded) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
        login,
        logout,
        loginAsAdmin,
        logoutAdmin,
        updateUserPoints,
        setUserTotalPoints,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

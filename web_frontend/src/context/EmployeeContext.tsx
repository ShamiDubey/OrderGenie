'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Employee } from '@/types';
import {
  employeeLogin as apiEmployeeLogin,
  employeeLogout as apiEmployeeLogout,
  getStoredEmployee,
  getStoredEmployeeToken,
  clearEmployeeSession,
  setSessionExpiredCallback,
} from '@/lib/employee-api';

interface EmployeeContextType {
  employee: Employee | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpired: boolean;
  login: (employeeId: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearSessionExpired: () => void;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Handle session expiry
  const handleSessionExpired = useCallback(() => {
    setEmployee(null);
    setSessionExpired(true);
    setError('Your session has expired. Please login again.');
    // Redirect to login
    router.push('/employee');
  }, [router]);

  // Set up session expiry callback
  useEffect(() => {
    setSessionExpiredCallback(handleSessionExpired);
  }, [handleSessionExpired]);

  // Load employee from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = getStoredEmployeeToken();
      const storedEmployee = getStoredEmployee();

      if (storedToken && storedEmployee) {
        setEmployee(storedEmployee);
      }
    } catch (err) {
      console.error('Error loading employee state:', err);
    }
    setIsLoading(false);
  }, []);

  const login = async (employeeId: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiEmployeeLogin(employeeId, pin);

      if (result.success && result.data) {
        setEmployee(result.data.employee);
        setIsLoading(false);
        return true;
      } else {
        setError(result.error || 'Login failed');
        setIsLoading(false);
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);

    try {
      await apiEmployeeLogout();
    } catch (err) {
      console.error('Logout error:', err);
    }

    clearEmployeeSession();
    setEmployee(null);
    setError(null);
    setSessionExpired(false);
    setIsLoading(false);
  };

  const clearSessionExpired = () => {
    setSessionExpired(false);
    setError(null);
  };

  return (
    <EmployeeContext.Provider
      value={{
        employee,
        isAuthenticated: !!employee,
        isLoading,
        error,
        sessionExpired,
        login,
        logout,
        clearSessionExpired,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployee() {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployee must be used within an EmployeeProvider');
  }
  return context;
}

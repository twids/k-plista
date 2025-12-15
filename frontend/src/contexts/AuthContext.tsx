import React, { createContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initialSearchRef = useRef<string>(window.location.search);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      // Check URL for login_success flag and error parameters
      const urlParams = new URLSearchParams(initialSearchRef.current || window.location.search);
      const loginSuccess = urlParams.get('login_success');
      const error = urlParams.get('error');
      const provider = urlParams.get('provider');
      
      if (error) {
        // Clear error from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        console.error('OAuth error:', error);
        if (provider) {
          console.error('Provider that failed:', provider);
        }
        setLoading(false);
        return;
      }
      
      if (loginSuccess) {
        // Clear the callback parameters from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          // Token is now in secure HTTP-only cookie, managed by browser automatically
          // Fetch current user - API calls will include cookie in requests
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          
          // Check if there's a returnUrl in sessionStorage
          const returnUrl = sessionStorage.getItem('returnUrl');
          if (returnUrl) {
            sessionStorage.removeItem('returnUrl');
            window.location.href = returnUrl;
          }
          
          setLoading(false);
          return;
        } catch (err) {
          console.error('Failed to fetch user after OAuth login:', err);
        }
      }
      
      // For subsequent visits, try to restore session from cookie
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch {
        // Not authenticated
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async () => {
    // Token is stored in secure HTTP-only cookie by backend
    // Just fetch the current user
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (provider: string, token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      // First, check for token in URL parameters (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const tokenFromUrl = urlParams.get('token');
      const loginSuccess = urlParams.get('login_success');
      const error = urlParams.get('error');
      
      if (error) {
        // Clear error from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        console.error('OAuth error:', error);
        const message = urlParams.get('message');
        if (message) {
          console.error('Error message:', decodeURIComponent(message));
        }
        setLoading(false);
        return;
      }
      
      if (tokenFromUrl && loginSuccess) {
        // Clear the token from URL for security
        window.history.replaceState({}, document.title, window.location.pathname);
        
        try {
          localStorage.setItem('token', tokenFromUrl);
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem('token');
        }
      }
      
      // Check for existing token in localStorage
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (_provider: string, token: string) => {
    localStorage.setItem('token', token);
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

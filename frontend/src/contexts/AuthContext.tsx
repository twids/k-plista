import React, { createContext, useState, useEffect, useRef } from 'react';
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
  const initialSearchRef = useRef<string>(window.location.search);

  const decodeToken = (token: string): User | null => {
    try {
      const [, payload] = token.split('.');
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      const userId = json.sub || json['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      const email = json.email || json['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      const name = json.name || json['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || email;
      if (!userId || !email) return null;
      return { id: userId, email, name };
    } catch (err) {
      console.warn('Failed to decode token', err);
      return null;
    }
  };

  useEffect(() => {
    // Check if user is already logged in
    const initAuth = async () => {
      // First, check for token in URL parameters (from OAuth callback)
      const urlParams = new URLSearchParams(initialSearchRef.current || window.location.search);
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
          const decodedUser = decodeToken(tokenFromUrl);
          if (decodedUser) {
            setUser(decodedUser);
          }
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
        const decodedUser = decodeToken(token);
        if (decodedUser) {
          setUser(decodedUser);
        }
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          localStorage.removeItem('token');
          setUser(null);
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

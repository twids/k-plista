import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { settingsService } from '../services/settingsService';

interface ThemeContextType {
  currentTheme: string;
  setTheme: (theme: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export { ThemeContext };

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<string>('default');

  // Load theme from authenticated user
  useEffect(() => {
    if (user?.theme) {
      setCurrentTheme(user.theme);
    } else {
      setCurrentTheme('default');
    }
  }, [user]);

  const setTheme = async (theme: string) => {
    try {
      // Persist to backend if user is authenticated
      if (user) {
        await settingsService.setTheme({ theme });
      }
      // Update local state immediately for instant theme switching
      setCurrentTheme(theme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
      throw error;
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../hooks/useAuth';
import { settingsService } from '../services/settingsService';
import type { ThemeName } from '../constants/themes';

interface ThemeContextType {
  currentTheme: ThemeName;
  setTheme: (theme: string) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export { ThemeContext };

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');

  // Load theme from authenticated user
  useEffect(() => {
    if (user?.theme) {
      // Normalize and validate theme
      const normalizedTheme = user.theme.toLowerCase();
      const validThemes: ThemeName[] = ['default', 'modern', 'dark'];
      
      if (validThemes.includes(normalizedTheme as ThemeName)) {
        setCurrentTheme(normalizedTheme as ThemeName);
      } else {
        setCurrentTheme('default');
      }
    } else {
      setCurrentTheme('default');
    }
  }, [user]);

  const setTheme = async (theme: string) => {
    try {
      // Normalize theme value
      const normalizedTheme = theme.toLowerCase();
      
      // Persist to backend if user is authenticated
      if (user) {
        await settingsService.setTheme({ theme: normalizedTheme });
      }
      // Update local state immediately for instant theme switching
      setCurrentTheme(normalizedTheme as ThemeName);
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

/**
 * 🎨 THEME PROVIDER - 224SOLUTIONS
 * Gestionnaire de thème avec mode sombre et personnalisation
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = '224solutions-theme'
}) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as 'light' | 'dark' | 'system') || defaultTheme;
    }
    return defaultTheme;
  });

  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Supprimer les classes de thème existantes
    root.classList.remove('light', 'dark');
    
    let resolvedTheme: 'light' | 'dark';
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      resolvedTheme = systemTheme;
    } else {
      resolvedTheme = theme;
    }
    
    setActualTheme(resolvedTheme);
    root.classList.add(resolvedTheme);
    
    // Sauvegarder dans localStorage
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  // Écouter les changements de préférence système
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        setActualTheme(systemTheme);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(systemTheme);
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme,
    actualTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

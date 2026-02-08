import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [theme, setThemeState] = useState<Theme>(() => {
        // Check local storage first for immediate load
        const saved = localStorage.getItem('theme') as Theme;
        return saved || 'light';
    });

    // Apply theme to document
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    // Load theme from Supabase on login
    useEffect(() => {
        const loadUserTheme = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from('user_settings')
                    .select('theme')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (data && (data as any).theme && !error) {
                    setThemeState((data as any).theme as Theme);
                }
            } catch (err) {
                console.error('Error loading theme:', err);
            }
        };

        loadUserTheme();
    }, [user]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setThemeState(newTheme);
        updateDatabaseTheme(newTheme);
    };

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        updateDatabaseTheme(newTheme);
    };

    const updateDatabaseTheme = async (newTheme: Theme) => {
        if (!user) return;
        try {
            await (supabase.from('user_settings') as any)
                .upsert({ user_id: user.id, theme: newTheme });
        } catch (err) {
            console.error('Error saving theme to DB:', err);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

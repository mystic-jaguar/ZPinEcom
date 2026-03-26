import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const RECENT_SEARCHES_KEY = '@ZPinEcom:recentSearches';
const MAX_RECENT_SEARCHES = 10;

interface SearchContextType {
    recentSearches: string[];
    addSearch: (query: string) => void;
    clearSearches: () => void;
    isLoading: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider = ({ children }: { children: ReactNode }) => {
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadSearches();
    }, []);

    const loadSearches = async () => {
        try {
            const data = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
            if (data) {
                setRecentSearches(JSON.parse(data));
            }
        } catch (error) {
            console.error('Error loading recent searches:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSearches = async (searches: string[]) => {
        try {
            await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
        } catch (error) {
            console.error('Error saving recent searches:', error);
        }
    };

    const addSearch = (query: string) => {
        if (!query || !query.trim()) return;

        setRecentSearches(prev => {
            // Remove if already exists
            const filtered = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
            // Add to beginning
            const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES);
            saveSearches(updated);
            return updated;
        });
    };

    const clearSearches = () => {
        setRecentSearches([]);
        AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    };

    return (
        <SearchContext.Provider value={{
            recentSearches,
            addSearch,
            clearSearches,
            isLoading
        }}>
            {children}
        </SearchContext.Provider>
    );
};

export const useSearch = () => {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch must be used within a SearchProvider');
    }
    return context;
};

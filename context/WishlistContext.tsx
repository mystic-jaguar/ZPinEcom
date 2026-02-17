import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { tokenManager } from '../services/api';
import { wishlistService } from '../services/wishlist';
import { ProductObject } from '../types/types';

const WISHLIST_STORAGE_KEY = '@ZPinEcom:wishlist';

interface WishlistContextType {
    wishlistItems: ProductObject[];
    addToWishlist: (product: ProductObject) => void;
    removeFromWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    clearWishlist: () => void;
    isLoading: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
    const [wishlistItems, setWishlistItems] = useState<ProductObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load wishlist from AsyncStorage on mount
    // API: GET /api/v1/wishlist - For server-side wishlist sync
    useEffect(() => {
        loadWishlist();
    }, []);

    const loadWishlist = async () => {
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                try {
                    const response = await wishlistService.getWishlist();
                    if (response.success && response.data) {
                        setWishlistItems(response.data); // Assuming response.data is ProductObject[] based on service
                        // Specifically, service returns response.data which is { wishlist: ..., pagination: ... }?
                        // Let's check service/wishlist.ts
                    }
                } catch (apiError) {
                    console.warn('Failed to load wishlist from server:', apiError);
                }
            }

            // Fallback / Merge logic could be complex. For now, trust server if logged in, else local
            const wishlistData = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
            if (!token && wishlistData) {
                setWishlistItems(JSON.parse(wishlistData));
            }
            // If logged in, we might want to merge local into server on first load? 
            // Keeping it simple: Server is source of truth if logged in.
        } catch (error) {
            console.error('Error loading wishlist:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveWishlist = async (items: ProductObject[]) => {
        try {
            await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            console.error('Error saving wishlist:', error);
        }
    };

    const addToWishlist = async (product: ProductObject) => {
        // Optimistic update
        setWishlistItems(prev => {
            if (prev.some(item => item.productId === product.productId)) {
                return prev;
            }
            const newItems = [...prev, product];
            saveWishlist(newItems);
            return newItems;
        });

        // Sync with backend
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.addToWishlist(product.productId);
            }
        } catch (error) {
            console.error('Error syncing add to wishlist:', error);
        }
    };

    const removeFromWishlist = async (productId: string) => {
        // Optimistic update
        setWishlistItems(prev => {
            const newItems = prev.filter(item => item.productId !== productId);
            saveWishlist(newItems);
            return newItems;
        });

        // Sync with backend
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.removeFromWishlist(productId);
            }
        } catch (error) {
            console.error('Error syncing remove from wishlist:', error);
        }
    };

    const isInWishlist = (productId: string) => {
        return wishlistItems.some(item => item.productId === productId);
    };

    const clearWishlist = async () => {
        setWishlistItems([]);
        AsyncStorage.removeItem(WISHLIST_STORAGE_KEY);

        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.clearWishlist();
            }
        } catch (error) {
            console.error('Error syncing clear wishlist:', error);
        }
    };

    return (
        <WishlistContext.Provider value={{
            wishlistItems,
            addToWishlist,
            removeFromWishlist,
            isInWishlist,
            clearWishlist,
            isLoading
        }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
};

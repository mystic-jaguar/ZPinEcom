import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { tokenManager } from '../services/api';
import { wishlistService } from '../services/wishlist';
import { ProductObject } from '../types/types';
import { useUser } from './UserContext';

const WISHLIST_STORAGE_KEY = '@ZPinEcom:wishlist';

interface WishlistContextType {
    wishlistItems: ProductObject[];
    addToWishlist: (product: ProductObject) => void;
    removeFromWishlist: (productId: string) => void;
    isInWishlist: (productId: string) => boolean;
    clearWishlist: () => void;
    isLoading: boolean;
    refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
    const [wishlistItems, setWishlistItems] = useState<ProductObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    const loadWishlist = useCallback(async () => {
        try {
            if (isAuthenticated) {
                const token = await tokenManager.getAccessToken();
                if (token && token !== 'null' && token !== 'undefined') {
                    try {
                        const response = await wishlistService.getWishlist();
                        // Backend: { success, data: [{ productId, productName, price, images, inStock }] }
                        const raw = (response as any).data || (response as any).wishlist || [];
                        if (Array.isArray(raw)) {
                            const normalized: ProductObject[] = raw.map((item: any) => ({
                                productId: item.productId || item.product_id,
                                productName: item.productName || item.product_name || '',
                                price: Number(item.price) || 0,
                                images: item.images || [],
                                inStock: item.inStock ?? item.in_stock ?? true,
                                userId: item.userId || '',
                                description: item.description || '',
                                categoryId: item.categoryId || '',
                                deepestCategoryName: item.deepestCategoryName || '',
                                categoryPath: item.categoryPath || 'All',
                                quantity: item.quantity || 0,
                                sellerLocation: item.sellerLocation || { city: '', state: '', pincode: '', coordinates: { type: 'Point', coordinates: [0, 0] } },
                                timeStamp: item.timeStamp || item.created_at || new Date().toISOString(),
                            }));
                            setWishlistItems(normalized);
                            await AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(normalized));
                            return;
                        }
                    } catch (apiError) {
                        console.warn('Failed to load wishlist from server:', apiError);
                        // If session expired, clear local wishlist too — user needs to re-login
                        if ((apiError as Error)?.message === 'SESSION_EXPIRED') {
                            setWishlistItems([]);
                            await AsyncStorage.removeItem(WISHLIST_STORAGE_KEY);
                            return;
                        }
                    }
                }
            }

            // Reached either as a guest, or when the authenticated fetch failed
            // for a non-auth reason. Fall back to the cached copy so a transient
            // network/500 shows the last known wishlist instead of 0.
            const wishlistData = await AsyncStorage.getItem(WISHLIST_STORAGE_KEY);
            if (wishlistData) {
                setWishlistItems(JSON.parse(wishlistData));
            }
        } catch (error) {
            console.error('Error loading wishlist:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    // Load wishlist from AsyncStorage on mount and sync if auth changes
    useEffect(() => {
        if (!isUserLoading) {
            loadWishlist();
        }
    }, [isUserLoading, loadWishlist]);

    // Persist the wishlist whenever it changes (after the initial load). One
    // centralized write covers optimistic updates and rollbacks, instead of
    // fire-and-forget writes buried in the state updaters that could be lost if
    // the component unmounted mid-write.
    useEffect(() => {
        if (isLoading) return; // don't clobber stored wishlist before loadWishlist() runs
        AsyncStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlistItems)).catch(err =>
            console.error('Error saving wishlist:', err)
        );
    }, [wishlistItems, isLoading]);

    const addToWishlist = async (product: ProductObject) => {
        // Optimistic update
        const previousItems = wishlistItems;
        setWishlistItems(prev =>
            prev.some(item => item.productId === product.productId)
                ? prev
                : [...prev, product]
        );

        // Sync with backend
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.addToWishlist(product.productId);
            }
        } catch (error) {
            console.error('Error syncing add to wishlist:', error);
            // Rollback on failure (persistence effect re-saves)
            setWishlistItems(previousItems);
            throw error;
        }
    };

    const removeFromWishlist = async (productId: string) => {
        // Optimistic update
        const previousItems = wishlistItems;
        setWishlistItems(prev => prev.filter(item => item.productId !== productId));

        // Sync with backend
        try {
            const token = await tokenManager.getAccessToken();
            if (token) {
                await wishlistService.removeFromWishlist(productId);
            }
        } catch (error) {
            console.error('Error syncing remove from wishlist:', error);
            // Rollback on failure (persistence effect re-saves)
            setWishlistItems(previousItems);
            throw error;
        }
    };

    const isInWishlist = (productId: string) => {
        return wishlistItems.some(item => item.productId === productId);
    };

    const clearWishlist = async () => {
        setWishlistItems([]);
        await AsyncStorage.removeItem(WISHLIST_STORAGE_KEY);

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
            isLoading,
            refreshWishlist: loadWishlist
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

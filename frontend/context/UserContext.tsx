import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { tokenManager } from '../services/api';
import { userService } from '../services/user';
import { CompleteUserProfile, UserDetailsObject, UserObject } from '../types/types';

const USER_STORAGE_KEY = '@ZPinEcom:user';
const USER_DETAILS_STORAGE_KEY = '@ZPinEcom:userDetails';

interface UserContextType {
    user: UserObject;
    userDetails?: UserDetailsObject;
    setUser: (rawUser: any) => void;
    updateUser: (updates: Partial<UserObject>) => void;
    updateUserDetails: (details: Partial<UserDetailsObject>) => void;
    setUserDetails: (details: UserDetailsObject) => void;
    setCompleteProfile: (profile: CompleteUserProfile) => void;
    resetUser: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Initial Empty User with extended fields for app functionality
const INITIAL_USER: any = {
    id: '',
    name: '',
    email: '',
    mobile: '',
    userName: '',
    userRole: 'customer',
    isVerified: false,
    profileImage: require('../assets/images/profile_icon.jpg'),
    timeStamp: new Date().toISOString(),
    // Extended fields for app functionality
    dob: '',
    gender: '',
    phoneNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    preferences: {
        receivePushNotifications: true,
        receiveEmailUpdates: false,
        receiveOrderUpdates: true
    }
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUserState] = useState<UserObject>(INITIAL_USER);
    const [userDetails, setUserDetailsState] = useState<UserDetailsObject | undefined>(undefined);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load User from Storage
    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
            const userDetailsData = await AsyncStorage.getItem(USER_DETAILS_STORAGE_KEY);
            const token = await tokenManager.getAccessToken();

            if (token && token !== 'null' && userData) {
                const rawUser = JSON.parse(userData);
                const parsedUser: UserObject = {
                    ...rawUser,
                    id: rawUser.id || rawUser._id || '',
                };
                setUserState(parsedUser);
                setIsAuthenticated(true);

                if (parsedUser.id) {
                    try {
                        const response = await userService.getUserById(parsedUser.id);
                        if (response.success && response.data) {
                            const raw = response.data as any;
                            const serverUser: UserObject = {
                                ...raw,
                                id: raw.id || raw._id || '',
                                // Explicitly map profile fields so they're never lost
                                dob: raw.dob || '',
                                gender: raw.gender || '',
                                profileImage: raw.profileImage || raw.profile_image || null,
                                receivePushNotifications: raw.receivePushNotifications ?? raw.receive_push_notifications ?? true,
                                receiveEmailUpdates: raw.receiveEmailUpdates ?? raw.receive_email_updates ?? false,
                                receiveOrderUpdates: raw.receiveOrderUpdates ?? raw.receive_order_updates ?? true,
                            } as any;
                            setUserState(serverUser);
                            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serverUser));
                        }
                    } catch (apiError: any) {
                        console.warn('Failed to refresh user data from server:', apiError);
                        const status = apiError?.response?.status;
                        const isSessionExpired = apiError?.message === 'SESSION_EXPIRED';
                        if (status === 401 || status === 403 || isSessionExpired) {
                            setIsAuthenticated(false);
                            await tokenManager.clearTokens?.();
                            await AsyncStorage.multiRemove([USER_STORAGE_KEY, USER_DETAILS_STORAGE_KEY]);
                        }
                    }
                }
            } else {
                setIsAuthenticated(false);
            }

            if (userDetailsData) {
                setUserDetails(JSON.parse(userDetailsData));
            }
        } catch (error) {
            console.error('Error loading user:', error);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const setUser = (rawUser: any) => {
        const user: UserObject = {
            ...rawUser,
            id: rawUser.id || rawUser._id || '',
        };
        setUserState(user);
        setIsAuthenticated(true);
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user)).catch(console.error);
    };

    const updateUser = async (updates: Partial<UserObject>) => {
        const previousUser = user;
        try {
            setUserState(prev => {
                const newUser = { ...prev, ...updates };
                AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser)).catch(console.error);
                return newUser;
            });

            // Only call API if there are actual fields the backend understands
            const apiFields = ['name', 'userName', 'dob', 'gender', 'receivePushNotifications', 'receiveEmailUpdates', 'receiveOrderUpdates'] as const;
            const hasApiFields = apiFields.some(f => (updates as any)[f] !== undefined);
            if (hasApiFields) {
                await userService.updateProfileJson(updates as any);
            }
        } catch (error) {
            console.error('Error updating user profile:', error);
            setUserState(previousUser);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(previousUser));
            throw error;
        }
    };

    const setUserDetails = (details: UserDetailsObject) => {
        setUserDetailsState(details);
        AsyncStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(details)).catch(console.error);
    };

    const updateUserDetails = async (updates: Partial<UserDetailsObject>) => {
        setUserDetailsState(prev => {
            if (!prev) {
                console.warn('Cannot update userDetails: no existing details to update');
                return prev;
            }
            const newDetails = { ...prev, ...updates };
            AsyncStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(newDetails)).catch(console.error);
            return newDetails;
        });
    };

    const setCompleteProfile = async (profile: CompleteUserProfile) => {
        setUserState(profile.user);
        setIsAuthenticated(true);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile.user));

        if (profile.details) {
            setUserDetails(profile.details);
            await AsyncStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(profile.details));
        }
    };

    const resetUser = async () => {
        setUserState(INITIAL_USER);
        setUserDetailsState(undefined);
        setIsAuthenticated(false);
        await AsyncStorage.multiRemove([USER_STORAGE_KEY, USER_DETAILS_STORAGE_KEY]);
        await tokenManager.clearTokens?.();
    };

    return (
        <UserContext.Provider value={{
            user,
            userDetails,
            setUser,
            updateUser,
            updateUserDetails,
            setUserDetails,
            setCompleteProfile,
            resetUser,
            isAuthenticated,
            isLoading
        }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

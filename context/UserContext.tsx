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
    updateUser: (updates: Partial<UserObject>) => void;
    updateUserDetails: (details: UserDetailsObject) => void;
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
<<<<<<< HEAD
    const [user, setUserState] = useState<UserObject>(INITIAL_USER);
    const [userDetails, setUserDetailsState] = useState<UserDetailsObject | undefined>(undefined);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
=======
    const [user, setUser] = useState<UserObject>(INITIAL_USER);
    const [userDetails, setUserDetails] = useState<UserDetailsObject | undefined>(undefined);
>>>>>>> parent of e49af4a (Integrating API's commit 1)
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

<<<<<<< HEAD
            if (token && token !== 'null' && userData) {
                const rawUser = JSON.parse(userData);
                // Normalize _id to id (backend returns MongoDB _id)
                const parsedUser: UserObject = {
                    ...rawUser,
                    id: rawUser.id || rawUser._id || '',
                };
                setUserState(parsedUser);
                setIsAuthenticated(true);

                // If we have a token and user ID, verify/refresh from server
                if (parsedUser.id) {
                    try {
                        const response = await userService.getUserById(parsedUser.id);
                        if (response.success && response.data) {
                            // Update local state with fresh data
                            const raw = response.data as any;
                            const serverUser: UserObject = {
                                ...raw,
                                id: raw.id || raw._id || '',
                            };
                            setUserState(serverUser);
                            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serverUser));
                        }
                    } catch (apiError: any) {
                        console.warn('Failed to refresh user data from server:', apiError);
                        // Check if it's an auth error (e.g., 401/403) - clear stale token
                        const status = apiError?.response?.status;
                        if (status === 401 || status === 403) {
                            setIsAuthenticated(false);
                            await tokenManager.clearTokens?.();
                            await AsyncStorage.removeItem(USER_STORAGE_KEY);
                        }
                        // Otherwise continue using local data for offline support
                    }
                }
            } else {
                setIsAuthenticated(false);
=======
            if (userData) {
                setUser(JSON.parse(userData));
>>>>>>> parent of e49af4a (Integrating API's commit 1)
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

<<<<<<< HEAD
    const setUser = (rawUser: any) => {
        // Normalize _id to id (backend returns MongoDB _id)
        const user: UserObject = {
            ...rawUser,
            id: rawUser.id || rawUser._id || '',
        };
        setUserState(user);
        setIsAuthenticated(true);
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user)).catch(console.error);
    };

    const updateUser = async (updates: Partial<UserObject>) => {
        const previousUser = user; // Capture for rollback
        try {
            // Optimistic update
            setUserState(prev => {
                const newUser = { ...prev, ...updates };
                AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser)).catch(console.error);
                return newUser;
            });

            // Prepare FormData for API
            const formData = new FormData();
            if (updates.name) formData.append('name', updates.name);
            if (updates.userName) formData.append('userName', updates.userName);
            if (updates.profileImage && typeof updates.profileImage === 'object') {
                // Assuming profileImage in updates is a File/Blob-like object if it's being updated
                // If it's a URL string, we might not need to send it unless backend handles URLs
                // formData.append('profileImage', updates.profileImage);
            }

            // Sync with backend
            // Note: updateUserProfile covers both user and details fields. 
            // We might need to check if we should verify the response.
            await userService.updateProfile(formData);

        } catch (error) {
            console.error('Error updating user profile:', error);
            // Rollback to previous state
            setUserState(previousUser);
            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(previousUser));
            throw error; // Re-throw so caller can handle (e.g., show toast)
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
=======
    const updateUser = async (updates: Partial<UserObject>) => {
        setUser(prev => {
            const newUser = { ...prev, ...updates };
            AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser)).catch(console.error);
            return newUser;
        });
    };

    const updateUserDetails = async (details: UserDetailsObject) => {
        setUserDetails(details);
        await AsyncStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(details));
    };

    const setCompleteProfile = async (profile: CompleteUserProfile) => {
        setUser(profile.user);
>>>>>>> parent of e49af4a (Integrating API's commit 1)
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile.user));

        if (profile.details) {
            setUserDetails(profile.details);
            await AsyncStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(profile.details));
        }
    };

    const resetUser = async () => {
<<<<<<< HEAD
        setUserState(INITIAL_USER);
        setUserDetailsState(undefined);
        setIsAuthenticated(false);
=======
        setUser(INITIAL_USER);
        setUserDetails(undefined);
>>>>>>> parent of e49af4a (Integrating API's commit 1)
        await AsyncStorage.multiRemove([USER_STORAGE_KEY, USER_DETAILS_STORAGE_KEY]);
        await tokenManager.clearTokens?.();
    };

    return (
        <UserContext.Provider value={{
            user,
            userDetails,
            updateUser,
            updateUserDetails,
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

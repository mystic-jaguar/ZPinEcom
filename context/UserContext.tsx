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
    setUser: (user: UserObject) => void;
    updateUser: (updates: Partial<UserObject>) => void;
    setUserDetails: (details: UserDetailsObject) => void;
    updateUserDetails: (updates: Partial<UserDetailsObject>) => void;
    setCompleteProfile: (profile: CompleteUserProfile) => void;
    resetUser: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Initial Empty User
const INITIAL_USER: UserObject = {
    id: '',
    name: '',
    email: '',
    mobile: '',
    userName: '',
    userRole: 'customer',
    isVerified: false,
    profileImage: require('../assets/images/profile_icon.jpg'),
    timeStamp: new Date().toISOString()
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

            if (token && userData) {
                const parsedUser = JSON.parse(userData);
                setUserState(parsedUser);
                setIsAuthenticated(true);

                // If we have a token and user ID, verify/refresh from server
                if (parsedUser.id) {
                    try {
                        const response = await userService.getUserById(parsedUser.id);
                        if (response.success && response.data) {
                            // Update local state with fresh data
                            const serverUser = response.data;
                            setUserState(serverUser);
                            await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(serverUser));
                        }
                    } catch (apiError) {
                        console.warn('Failed to refresh user data from server:', apiError);
                        // Continue using local data
                    }
                }
            } else {
                setIsAuthenticated(false);
            }

            if (userDetailsData) {
                setUserDetailsState(JSON.parse(userDetailsData));
            }
        } catch (error) {
            console.error('Error loading user:', error);
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    const setUser = (user: UserObject) => {
        setUserState(user);
        setIsAuthenticated(true);
        AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user)).catch(console.error);
    };

    const updateUser = async (updates: Partial<UserObject>) => {
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
            // Revert or show error (implementation depends on UI requirements)
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
            setUserDetailsState(profile.details);
            await AsyncStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(profile.details));
        }
    };

    const resetUser = async () => {
        setUserState(INITIAL_USER);
        setUserDetailsState(undefined);
        setIsAuthenticated(false);
        await AsyncStorage.multiRemove([USER_STORAGE_KEY, USER_DETAILS_STORAGE_KEY]);
    };

    return (
        <UserContext.Provider value={{
            user,
            userDetails,
            setUser,
            updateUser,
            setUserDetails,
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

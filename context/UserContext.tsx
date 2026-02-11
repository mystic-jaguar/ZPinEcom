import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
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
    const [user, setUser] = useState<UserObject>(INITIAL_USER);
    const [userDetails, setUserDetails] = useState<UserDetailsObject | undefined>(undefined);
    const [isLoading, setIsLoading] = useState(true);

    // Load User from Storage
    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const userData = await AsyncStorage.getItem(USER_STORAGE_KEY);
            const userDetailsData = await AsyncStorage.getItem(USER_DETAILS_STORAGE_KEY);

            if (userData) {
                setUser(JSON.parse(userData));
            }
            if (userDetailsData) {
                setUserDetails(JSON.parse(userDetailsData));
            }
        } catch (error) {
            console.error('Error loading user:', error);
        } finally {
            setIsLoading(false);
        }
    };

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
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile.user));

        if (profile.details) {
            setUserDetails(profile.details);
            await AsyncStorage.setItem(USER_DETAILS_STORAGE_KEY, JSON.stringify(profile.details));
        }
    };

    const resetUser = async () => {
        setUser(INITIAL_USER);
        setUserDetails(undefined);
        await AsyncStorage.multiRemove([USER_STORAGE_KEY, USER_DETAILS_STORAGE_KEY]);
    };

    const isAuthenticated = user.id !== '';

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

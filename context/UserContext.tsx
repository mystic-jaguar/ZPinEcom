import React, { createContext, ReactNode, useContext, useState } from 'react';
import { CompleteUserProfile, UserDetailsObject, UserObject } from '../types/types';

interface UserContextType {
    user: UserObject;
    userDetails?: UserDetailsObject;
    updateUser: (updates: Partial<UserObject>) => void;
    updateUserDetails: (details: UserDetailsObject) => void;
    setCompleteProfile: (profile: CompleteUserProfile) => void;
    resetUser: () => void;
    isAuthenticated: boolean;
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

    const updateUser = (updates: Partial<UserObject>) => {
        setUser(prev => ({ ...prev, ...updates }));
    };

    const updateUserDetails = (details: UserDetailsObject) => {
        setUserDetails(details);
    };

    const setCompleteProfile = (profile: CompleteUserProfile) => {
        setUser(profile.user);
        if (profile.details) {
            setUserDetails(profile.details);
        }
    };

    const resetUser = () => {
        setUser(INITIAL_USER);
        setUserDetails(undefined);
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
            isAuthenticated
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

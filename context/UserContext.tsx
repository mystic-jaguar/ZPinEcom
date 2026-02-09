import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface User {
    _id: string;
    userId: string;
    name: string;
    email: string;
    dob: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    coordinates: {
        type: 'Point';
        coordinates: [number, number];
    };
    gender: string;
    profileImage: any; // Using 'any' to support both require() and URI strings for now
    createdAt: string;
    isPro: boolean;
    phoneNumber: string;
    preferences: {
        receivePushNotifications: boolean;
        twoFactorAuth: boolean;
    };
}

interface UserContextType {
    user: User;
    updateUser: (updates: Partial<User>) => void;
    resetUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock Initial Data
const INITIAL_USER: User = {
    _id: "",
    userId: "",
    name: '',
    email: '',
    dob: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    coordinates: {
        type: "Point",
        coordinates: [0, 0]
    },
    gender: "",
    profileImage: require('../assets/images/profile_icon.jpg'), // Keeping default asset as placeholder
    createdAt: new Date().toISOString(),
    isPro: false,
    phoneNumber: '',
    preferences: {
        receivePushNotifications: false,
        twoFactorAuth: false
    }
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>(INITIAL_USER);

    const updateUser = (updates: Partial<User>) => {
        setUser(prev => ({ ...prev, ...updates }));
    };

    const resetUser = () => {
        setUser(INITIAL_USER);
    };

    return (
        <UserContext.Provider value={{ user, updateUser, resetUser }}>
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

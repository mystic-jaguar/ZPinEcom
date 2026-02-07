import React, { createContext, ReactNode, useContext, useState } from 'react';

export interface PaymentCard {
    id: string;
    cardNumber: string; // Stored securely in real app, here just string
    cardHolderName: string;
    expiryDate: string;
    cvv: string;
    bankName: string; // Derived or mock
    cardType: 'Credit Card' | 'Debit Card'; // CREDIT CARD / DEBIT CARD
    iconName: any; // Ionicons name
    iconColor: string;
}

export interface PaymentUPI {
    id: string;
    upiId: string;
    label: string; // e.g., Google Pay
    subLabel: string; // e.g., username@okaxis
    upiApp: 'Google Pay' | 'PhonePe' | 'Paytm';
}

interface PaymentContextType {
    cards: PaymentCard[];
    upis: PaymentUPI[];
    addCard: (card: Omit<PaymentCard, 'id' | 'bankName' | 'iconName' | 'iconColor'>) => void;
    updateCard: (id: string, updates: Partial<PaymentCard>) => void;
    deleteCard: (id: string) => void;
    addUPI: (upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => void;
    updateUPI: (id: string, upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => void;
    deleteUPI: (id: string) => void;
    getCard: (id: string) => PaymentCard | undefined;
    getUPI: (id: string) => PaymentUPI | undefined;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export const PaymentProvider = ({ children }: { children: ReactNode }) => {
    // Initial Mock Data
    const [cards, setCards] = useState<PaymentCard[]>([
        {
            id: '1',
            cardNumber: '1234567812341234',
            cardHolderName: 'Jay Warale',
            expiryDate: '09/28',
            cvv: '123',
            bankName: 'HDFC Bank',
            cardType: 'Credit Card',
            iconName: 'business',
            iconColor: '#1565C0'
        },
        {
            id: '2',
            cardNumber: '8765432187655678',
            cardHolderName: 'Jay Warale',
            expiryDate: '12/26',
            cvv: '456',
            bankName: 'ICICI Bank',
            cardType: 'Debit Card',
            iconName: 'home',
            iconColor: '#E65100'
        }
    ]);

    const [upis, setUpis] = useState<PaymentUPI[]>([
        {
            id: '1',
            upiId: 'jaywarale@okaxis',
            label: 'Google Pay',
            subLabel: 'jaywarale@okaxis',
            upiApp: 'Google Pay'
        }
    ]);

    const addCard = (card: Omit<PaymentCard, 'id' | 'bankName' | 'iconName' | 'iconColor'>) => {
        const newCard: PaymentCard = {
            id: Math.random().toString(36).substr(2, 9),
            ...card,
            bankName: 'HDFC Bank', // Mock logic for bank name
            iconName: 'card', // Default icon
            iconColor: '#4CAF50'
        };
        setCards([...cards, newCard]);
    };

    const updateCard = (id: string, updates: Partial<PaymentCard>) => {
        setCards(cards.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const deleteCard = (id: string) => {
        setCards(cards.filter(c => c.id !== id));
    };

    const addUPI = (upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => {
        const newUPI: PaymentUPI = {
            id: Math.random().toString(36).substr(2, 9),
            upiId,
            label: upiApp,
            subLabel: upiId,
            upiApp: upiApp
        };
        setUpis([...upis, newUPI]);
    };

    const updateUPI = (id: string, upiId: string, upiApp: 'Google Pay' | 'PhonePe' | 'Paytm') => {
        setUpis(upis.map(u => u.id === id ? { ...u, upiId, label: upiApp, subLabel: upiId, upiApp: upiApp } : u));
    };

    const deleteUPI = (id: string) => {
        setUpis(upis.filter(u => u.id !== id));
    };

    const getCard = (id: string) => cards.find(c => c.id === id);
    const getUPI = (id: string) => upis.find(u => u.id === id);


    return (
        <PaymentContext.Provider value={{
            cards,
            upis,
            addCard,
            updateCard,
            deleteCard,
            addUPI,
            updateUPI,
            deleteUPI,
            getCard,
            getUPI
        }}>
            {children}
        </PaymentContext.Provider>
    );
};

export const usePayment = () => {
    const context = useContext(PaymentContext);
    if (!context) {
        throw new Error('usePayment must be used within a PaymentProvider');
    }
    return context;
};

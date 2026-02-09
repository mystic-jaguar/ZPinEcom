import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Address } from './AddressContext';

export interface OrderItem {
    id: string; // Product ID
    name: string;
    image: any;
    price: number;
    quantity: number;
    variant?: string;
    cartId?: string;
}

export interface Order {
    id: string;
    orderNumber: string;
    date: string;
    status: 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Unpacked';
    items: OrderItem[];
    total: number;
    address: Address;
    paymentMethod: string;
    estimatedDelivery: string;
    deliveryFee: number;
    taxes: number;
    subtotal: number;
    savings: number;
    isInstant: boolean;
}

interface OrderContextType {
    orders: Order[];
    addOrder: (order: Order) => void;
    getOrderById: (id: string) => Order | undefined;
    cancelOrder: (id: string) => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Mock initial data
const DUMMY_ORDERS: Order[] = [
    {
        id: 'mock-1',
        orderNumber: 'ZP-98231',
        date: '2024-10-24',
        status: 'Delivered',
        items: [{
            id: '2',
            name: 'School Backpack',
            image: require('../assets/images/backpacks.jpg'),
            price: 899,
            quantity: 1,
            variant: 'Standard Variant'
        }],
        total: 899,
        address: {
            id: 'addr-1',
            name: 'John Doe',
            addressLine: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            phoneNumber: '9876543210',
            country: 'India',
            type: 'Home',
            isDefault: true,
            landmark: 'Near Park'
        },
        paymentMethod: 'UPI',
        estimatedDelivery: 'Oct 26, 2024',
        deliveryFee: 0,
        taxes: 0,
        subtotal: 899,
        savings: 0,
        isInstant: false
    },
    {
        id: 'mock-2',
        orderNumber: 'ZP-98232',
        date: '2024-10-25',
        status: 'Unpacked', // Will show as Processing
        items: [{
            id: '7',
            name: 'Hydrating Face Wash',
            image: require('../assets/images/facewash.jpg'),
            price: 299,
            quantity: 2,
            variant: '100ml'
        }],
        total: 598,
        address: {
            id: 'addr-1',
            name: 'John Doe',
            addressLine: '123 Main St',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400001',
            phoneNumber: '9876543210',
            country: 'India',
            type: 'Home',
            isDefault: true,
            landmark: 'Near Park'
        },
        paymentMethod: 'Credit Card',
        estimatedDelivery: 'Oct 28, 2024',
        deliveryFee: 40,
        taxes: 0,
        subtotal: 598,
        savings: 0,
        isInstant: true
    }
];

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const [orders, setOrders] = useState<Order[]>(DUMMY_ORDERS);

    const addOrder = (order: Order) => {
        setOrders(prev => [order, ...prev]);
    };

    const getOrderById = (id: string) => {
        return orders.find(o => o.orderNumber === id || o.id === id);
    };

    const cancelOrder = (id: string) => {
        // API: PUT /api/v1/orders/:id/cancel
        setOrders(prev => prev.map(order =>
            order.id === id ? { ...order, status: 'Cancelled' as const } : order
        ));
    };

    return (
        <OrderContext.Provider value={{
            orders,
            addOrder,
            getOrderById,
            cancelOrder
        }}>
            {children}
        </OrderContext.Provider>
    );
};

export const useOrder = () => {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrder must be used within an OrderProvider');
    }
    return context;
};

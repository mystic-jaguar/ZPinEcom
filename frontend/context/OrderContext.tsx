import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { tokenManager } from '../services/api';
import { CancelOrderData, orderService } from '../services/order';
import { OrderObject } from '../types/types';
import { useUser } from './UserContext';

interface OrderContextType {
    orders: OrderObject[];
    addOrder: (order: OrderObject) => void;
    getOrderById: (id: string) => OrderObject | undefined;
    cancelOrder: (id: string, data: CancelOrderData) => Promise<{ message: string; refundAmount: number; refundStatus: string }>;
    updateOrderStatus: (id: string, status: OrderObject['status']) => void;
    isLoading: boolean;
    refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider = ({ children }: { children: ReactNode }) => {
    const [orders, setOrders] = useState<OrderObject[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const { isAuthenticated, isLoading: isUserLoading } = useUser();

    useEffect(() => {
        if (!isUserLoading) {
            loadOrders();
        }
    }, [isAuthenticated, isUserLoading]);

    const loadOrders = async () => {
        if (!isAuthenticated) {
            setOrders([]);
            setIsLoading(false);
            return;
        }
        try {
            const token = await tokenManager.getAccessToken();
            if (!token || token === 'null' || token === 'undefined') {
                setOrders([]);
                return;
            }
            const response = await orderService.getOrders();
            // Backend: { success, data: [...], pagination: {} }
            const raw = (response as any).data || (response as any).orders || [];
            if (Array.isArray(raw)) {
                const normalized: OrderObject[] = raw.map((o: any) => ({
                    id: o.id,
                    userId: o.userId,
                    sellerId: o.sellerId || '',
                    orderNumber: o.orderNumber,
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalAmount: Number(o.totalAmount || 0),
                    shippingAmount: Number(o.shippingAmount || 0),
                    taxAmount: Number(o.taxAmount || 0),
                    finalAmount: Number(o.finalAmount || 0),
                    shippingAddress: o.shippingAddress || {},
                    paymentMethod: o.paymentMethod || 'cod',
                    paymentId: o.paymentId,
                    items: Array.isArray(o.items) ? o.items.map((item: any) => ({
                        orderItemId: item.orderItemId || item.id,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        price: Number(item.price || 0),
                        image: item.image || '',
                        variant: item.variant,
                    })) : [],
                    estimatedDelivery: o.estimatedDelivery || '',
                    trackingNumber: o.trackingNumber,
                    notes: o.notes,
                    createdAt: o.createdAt,
                    updatedAt: o.updatedAt,
                    date: o.createdAt,
                }));
                // Filter out pending+unpaid orders (failed/abandoned payments)
                setOrders(normalized.filter(o => !(o.status === 'pending' && o.paymentStatus === 'pending')));
            }
        } catch (error: any) {
            console.error('Failed to load orders:', error);
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    };

    const addOrder = (order: OrderObject) => {
        const safe: OrderObject = {
            ...order,
            items: Array.isArray(order.items) ? order.items : [],
            status: order.status || 'pending',
            paymentStatus: order.paymentStatus || 'pending',
            totalAmount: Number(order.totalAmount || 0),
            finalAmount: Number(order.finalAmount || 0),
            shippingAmount: Number(order.shippingAmount || 0),
            taxAmount: Number(order.taxAmount || 0),
        };
        setOrders(prev => [safe, ...prev]);
    };

    const getOrderById = (id: string) => {
        return orders.find(o => o.orderNumber === id || o.id === id);
    };

    const cancelOrder = async (id: string, data: CancelOrderData) => {
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'cancelled' as const } : o));
        try {
            const response = await orderService.cancelOrder(id, data);
            if (!response.data) throw new Error('Invalid response');
            setOrders(prev => prev.map(o =>
                o.id === id ? { ...o, paymentStatus: response.data.refundStatus as OrderObject['paymentStatus'] } : o
            ));
            return response.data;
        } catch (error) {
            await loadOrders();
            throw error;
        }
    };

    const updateOrderStatus = (id: string, status: OrderObject['status']) => {
        setOrders(prev => prev.map(o =>
            o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
        ));
    };

    return (
        <OrderContext.Provider value={{
            orders,
            addOrder,
            getOrderById,
            cancelOrder,
            updateOrderStatus,
            isLoading,
            refreshOrders: loadOrders,
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

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
                    userId: o.user_id || o.userId,
                    sellerId: o.seller_id || o.sellerId || '',
                    orderNumber: o.order_number || o.orderNumber,
                    status: o.status,
                    paymentStatus: o.payment_status || o.paymentStatus,
                    totalAmount: Number(o.total_amount || o.totalAmount || 0),
                    shippingAmount: Number(o.shipping_amount || o.shippingAmount || 0),
                    taxAmount: Number(o.tax_amount || o.taxAmount || 0),
                    finalAmount: Number(o.final_amount || o.finalAmount || 0),
                    shippingAddress: o.shipping_address || o.shippingAddress || {},
                    paymentMethod: o.payment_method || o.paymentMethod || 'cod',
                    paymentId: o.payment_id || o.paymentId,
                    items: Array.isArray(o.items) ? o.items.map((item: any) => ({
                        productId: item.productId || item.product_id,
                        productName: item.productName || item.product_name,
                        quantity: item.quantity,
                        price: Number(item.price || 0),
                        image: item.image || '',
                        variant: item.variant,
                    })) : [],
                    estimatedDelivery: o.estimated_delivery || o.estimatedDelivery || '',
                    trackingNumber: o.tracking_number || o.trackingNumber,
                    notes: o.notes,
                    createdAt: o.created_at || o.createdAt,
                    updatedAt: o.updated_at || o.updatedAt,
                    date: o.created_at || o.createdAt,
                }));
                setOrders(normalized);
            }
        } catch (error: any) {
            console.error('Failed to load orders:', error);
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    };

    const addOrder = (order: OrderObject) => {
        setOrders(prev => [order, ...prev]);
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

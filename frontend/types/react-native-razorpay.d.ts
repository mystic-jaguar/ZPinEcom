declare module 'react-native-razorpay' {
    interface RazorpayOptions {
        description: string;
        image?: string;
        currency: string;
        key: string;
        amount: string;
        name: string;
        order_id: string;
        prefill?: {
            email?: string;
            contact?: string;
            name?: string;
            vpa?: string; // UPI ID
            method?: 'netbanking' | 'card' | 'upi' | 'wallet' | 'emi' | 'paylater';
        };
        method?: {
            upi?: boolean;
            card?: boolean;
            netbanking?: boolean;
            wallet?: boolean;
            emi?: boolean;
            paylater?: boolean;
        };
        theme?: {
            color?: string;
        };
    }

    interface RazorpaySuccessResponse {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }

    interface RazorpayErrorResponse {
        code: number;
        description: string;
        source?: string;
        step?: string;
        reason?: string;
        metadata?: {
            order_id?: string;
            payment_id?: string;
        };
    }

    const RazorpayCheckout: {
        open(options: RazorpayOptions): Promise<RazorpaySuccessResponse>;
    };

    export default RazorpayCheckout;
}

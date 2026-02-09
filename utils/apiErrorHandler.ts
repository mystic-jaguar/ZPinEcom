// API Error Handler Utility
// Provides user-friendly error messages for API errors

interface APIError {
    status?: number;
    message?: string;
    code?: string;
}

/**
 * Maps technical API errors to user-friendly messages
 * Never exposes technical details like stack traces or internal paths
 */
export const handleAPIError = (error: APIError | Error | any): string => {
    // Log detailed error for debugging (development only)
    if (__DEV__) {
        console.error('API Error:', error);
    }

    // Handle network errors
    if (!error.status && (error.message?.includes('Network') || error.message?.includes('connect'))) {
        return 'Please check your internet connection and try again.';
    }

    // Handle timeout errors
    if (error.message?.includes('timeout')) {
        return 'Request timed out. Please try again.';
    }

    // Handle HTTP status codes
    if (error.status) {
        switch (error.status) {
            case 400:
                return error.message || 'Invalid request. Please check your input.';
            case 401:
                return 'Session expired. Please login again.';
            case 403:
                return 'Access denied. You don\'t have permission to perform this action.';
            case 404:
                return 'The requested item was not found.';
            case 409:
                return error.message || 'This action conflicts with existing data.';
            case 422:
                return error.message || 'Invalid data. Please check your input.';
            case 429:
                return 'Too many requests. Please slow down and try again later.';
            case 500:
                return 'Server error. We\'re working on it. Please try again later.';
            case 502:
            case 503:
            case 504:
                return 'Service temporarily unavailable. Please try again.';
            default:
                return 'Something went wrong. Please try again.';
        }
    }

    // Generic fallback for unknown errors
    return 'Something went wrong. Please try again.';
};

/**
 * Wraps an API call with error handling
 * Returns { success: boolean, data?: any, error?: string }
 */
export const safeAPICall = async <T>(
    apiCall: () => Promise<T>
): Promise<{ success: boolean; data?: T; error?: string }> => {
    try {
        const data = await apiCall();
        return { success: true, data };
    } catch (error) {
        const errorMessage = handleAPIError(error);
        return { success: false, error: errorMessage };
    }
};

// Validation Utilities
// API-related validation functions for user inputs

/**
 * Sanitizes user input by removing potentially dangerous characters
 */
export const sanitizeInput = (value: string): string => {
    if (!value) return '';
    // Remove HTML tags
    let sanitized = value.replace(/<[^>]*>/g, '');
    // Remove SQL injection patterns
    sanitized = sanitized.replace(/('|(--)|;|\/\*|\*\/|xp_|sp_)/gi, '');
    // Trim whitespace
    return sanitized.trim();
};

/**
 * Validates email format
 * Returns true if email is valid
 */
export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validates Indian phone number (10 digits)
 * Returns true if phone is valid
 */
export const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validates Indian pincode (6 digits)
 * Returns true if pincode is valid
 */
export const validatePincode = (pincode: string): boolean => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
};

/**
 * Validates UPI ID format
 * Returns true if UPI ID is valid
 */
export const validateUPI = (upiId: string): boolean => {
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/;
    return upiRegex.test(upiId);
};

/**
 * Validates credit/debit card number using Luhn algorithm
 * Returns true if card number is valid
 */
export const validateCardNumber = (cardNumber: string): boolean => {
    // Remove spaces and non-digits
    const cleanedNumber = cardNumber.replace(/\D/g, '');

    if (cleanedNumber.length < 13 || cleanedNumber.length > 19) {
        return false;
    }

    // Luhn algorithm
    let sum = 0;
    let isEven = false;

    for (let i = cleanedNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cleanedNumber[i], 10);

        if (isEven) {
            digit *= 2;
            if (digit > 9) {
                digit -= 9;
            }
        }

        sum += digit;
        isEven = !isEven;
    }

    return sum % 10 === 0;
};

/**
 * Validates card expiry date (MM/YY or MM/YYYY format)
 * Returns true if expiry is valid and not expired
 */
export const validateCardExpiry = (expiry: string): boolean => {
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2,4}$/;

    if (!expiryRegex.test(expiry)) {
        return false;
    }

    const [month, year] = expiry.split('/');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    let expiryYear = parseInt(year, 10);
    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
        expiryYear += expiryYear < 50 ? 2000 : 1900;
    }

    const expiryMonth = parseInt(month, 10);

    // Check if card is expired
    if (expiryYear < currentYear) {
        return false;
    }
    if (expiryYear === currentYear && expiryMonth < currentMonth) {
        return false;
    }

    return true;
};

/**
 * Validates CVV (3 or 4 digits)
 * Returns true if CVV is valid
 */
export const validateCVV = (cvv: string): boolean => {
    const cvvRegex = /^\d{3,4}$/;
    return cvvRegex.test(cvv);
};

/**
 * Validates password strength
 * Returns object with isValid and requirements
 */
export const validatePassword = (password: string): { isValid: boolean; requirements: string[] } => {
    const requirements = [];

    if (password.length < 8) {
        requirements.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        requirements.push('One uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        requirements.push('One lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        requirements.push('One number');
    }
    if (!/[!@#$%^&*]/.test(password)) {
        requirements.push('One special character (!@#$%^&*)');
    }

    return {
        isValid: requirements.length === 0,
        requirements
    };
};

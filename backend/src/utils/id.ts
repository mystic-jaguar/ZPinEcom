import { randomBytes } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const SHORT_ID_PATTERN = /^[A-Z0-9]{7}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Generates a random 7-character alphanumeric ID (e.g. "A3K9X2M").
 * Uses uppercase letters and digits for readability.
 */
export function generateId(): string {
    let id = '';
    const bytes = randomBytes(7);
    for (let i = 0; i < 7; i++) {
        id += CHARS[bytes[i] % CHARS.length];
    }
    return id;
}

export function isValidShortId(value: string): boolean {
    return SHORT_ID_PATTERN.test(value) || UUID_PATTERN.test(value);
}

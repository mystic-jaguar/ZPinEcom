import { randomBytes } from 'crypto';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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

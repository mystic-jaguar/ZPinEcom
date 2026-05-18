import apiClient from './api';

// Derive health endpoint base from the API base URL
const BASE = (apiClient.defaults.baseURL || '')
    .replace(/\/api\/v1\/?$/, '')
    .replace(/\/+$/, '');

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Pings the backend /health endpoint every 10 minutes to prevent
 * the backend from going idle.
 */
export function startKeepAlive() {
    if (intervalId) return;
    const ping = () => {
        fetch(`${BASE}/health`).catch(() => {});
    };
    ping(); // immediate ping on app start
    intervalId = setInterval(ping, 10 * 60 * 1000);
}

export function stopKeepAlive() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

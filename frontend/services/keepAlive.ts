import apiClient from './api';

// Base URL without the /api/v1/ suffix for the health endpoint
const BASE = apiClient.defaults.baseURL?.replace('/api/v1/', '') || '';

let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Pings the backend /health endpoint every 10 minutes to prevent
 * Render free tier cold starts (backend spins down after 15min inactivity).
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

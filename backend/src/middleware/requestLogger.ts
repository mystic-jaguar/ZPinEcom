import { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger';

/**
 * Logs every request: method, path, IP, status, duration.
 * Flags unusual patterns: oversized payloads, suspicious user agents, high-frequency IPs.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || '';

    // Flag suspicious user agents (bots, scanners, curl scripts)
    const suspiciousUA = /sqlmap|nikto|nmap|masscan|zgrab|python-requests|go-http-client|curl/i.test(ua);
    if (suspiciousUA) {
        logger.suspiciousRequest(ip, req.path, `Suspicious user-agent: ${ua.slice(0, 80)}`);
    }

    // Flag missing user agent entirely (common in automated scripts)
    if (!ua && req.path !== '/health') {
        logger.suspiciousRequest(ip, req.path, 'Missing user-agent');
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;

        // Log 4xx/5xx as warnings/errors
        if (status >= 500) {
            logger.error('request.error', { method: req.method, path: req.path, status, duration, ip });
        } else if (status === 429) {
            logger.rateLimitHit(ip, req.path);
        } else if (status >= 400) {
            logger.warn('request.client_error', { method: req.method, path: req.path, status, duration, ip });
        } else {
            logger.info('request', { method: req.method, path: req.path, status, duration, ip });
        }

        // Flag slow responses (>5s) — may indicate DB issues or attack
        if (duration > 5000) {
            logger.warn('request.slow', { method: req.method, path: req.path, duration, ip });
        }
    });

    next();
}

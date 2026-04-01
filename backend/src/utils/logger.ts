/**
 * Structured logger — all output is JSON in production for log aggregation tools.
 * In development, outputs readable text.
 */

const isProd = process.env.NODE_ENV === 'production';

type LogLevel = 'info' | 'warn' | 'error' | 'security';

function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
    const entry = {
        ts: new Date().toISOString(),
        level,
        event,
        ...data,
    };

    if (isProd) {
        // JSON lines — parseable by Render log drains, Datadog, etc.
        process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
        const color = level === 'error' ? '\x1b[31m'
            : level === 'warn' ? '\x1b[33m'
            : level === 'security' ? '\x1b[35m'
            : '\x1b[36m';
        console.log(`${color}[${level.toUpperCase()}]\x1b[0m ${event}`, data || '');
    }
}

export const logger = {
    info:     (event: string, data?: Record<string, unknown>) => log('info', event, data),
    warn:     (event: string, data?: Record<string, unknown>) => log('warn', event, data),
    error:    (event: string, data?: Record<string, unknown>) => log('error', event, data),

    // Security events — always logged regardless of environment
    security: (event: string, data?: Record<string, unknown>) => log('security', event, data),

    // Auth-specific helpers
    authSuccess: (userId: string, ip: string, action: string) =>
        log('security', 'auth.success', { userId, ip, action }),

    authFailure: (ip: string, action: string, reason: string, identifier?: string) =>
        log('security', 'auth.failure', { ip, action, reason, identifier }),

    rateLimitHit: (ip: string, path: string) =>
        log('security', 'rate_limit.hit', { ip, path }),

    suspiciousRequest: (ip: string, path: string, reason: string) =>
        log('security', 'suspicious.request', { ip, path, reason }),
};

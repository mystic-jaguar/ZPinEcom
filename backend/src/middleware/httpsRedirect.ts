import { NextFunction, Request, Response } from 'express';

/**
 * Redirects HTTP to HTTPS in production.
 * Render terminates TLS at the proxy level and sets x-forwarded-proto.
 * This middleware enforces HTTPS at the application level as a second layer.
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction): void {
    if (process.env.NODE_ENV !== 'production') {
        return next(); // skip in development
    }

    // Skip HTTPS redirect when running on bare IP (no domain/SSL configured)
    if (process.env.HTTPS_REDIRECT !== 'true') {
        return next();
    }

    const proto = req.headers['x-forwarded-proto'];
    if (proto && proto !== 'https') {
        const httpsUrl = `https://${req.headers.host}${req.url}`;
        res.redirect(301, httpsUrl);
        return;
    }

    next();
}

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const headerToken = req.headers['x-auth-token'] as string;
  const cookieToken = req.cookies?.token;

  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (headerToken) {
    token = headerToken;
  } else if (cookieToken) {
    token = cookieToken;
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; userRole: string };
    req.userId = decoded.userId;
    req.userRole = decoded.userRole;
    next();
  } catch (err: any) {
    const reason = err?.name === 'TokenExpiredError' ? 'token_expired' : 'token_invalid';
    logger.authFailure(req.ip || '', 'token_verify', reason);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

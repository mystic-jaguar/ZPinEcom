import { NextFunction, Request, Response } from 'express';

type Sanitizable = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

const SENSITIVE_KEY_PATTERNS = [
  /^password$/i,
  /^(access|refresh|reset|auth|id)token$/i,
  /^secret$/i,
  /^otp$/i,
  /^pin$/i,
  /^cvv$/i,
  /^cardnumber$/i,
  /^signature$/i,
];

function isSensitiveKey(keyPath: string[]): boolean {
  return keyPath.some(segment => SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(segment)));
}

function sanitizeString(value: string): string {
  const normalized = value.normalize('NFKC');
  const withoutNullBytes = normalized.replace(/\u0000/g, '');
  const withoutControlChars = withoutNullBytes.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  const withoutTags = withoutControlChars.replace(/<[^>]*>/g, '');

  return withoutTags.trim();
}

function sanitizeValue(value: Sanitizable, keyPath: string[] = []): Sanitizable {
  if (typeof value === 'string') {
    return isSensitiveKey(keyPath) ? value : sanitizeString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item as Sanitizable, [...keyPath, String(index)]));
  }

  if (value && typeof value === 'object') {
    const sanitizedObject: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      sanitizedObject[key] = sanitizeValue(nestedValue as Sanitizable, [...keyPath, key]);
    }

    return sanitizedObject;
  }

  return value;
}

export function inputSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body) as Request['body'];
  }

  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as Request['query'];
  }

  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as Request['params'];
  }

  next();
}
/**
 * Verbatim port of website-customer/backend/utils/canonicalizeEmail.js.
 * The website stores Gmail addresses canonical (dots and +tags folded), so a
 * lowercase-only lookup here missed every dotted Gmail account made there:
 * login failed, forgot-password sent nothing, Google sign-in made a duplicate.
 */
export function canonicalizeEmail(rawEmail: string): string {
  const email = String(rawEmail).trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at === -1) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const canonicalLocal = local.split('+')[0].replace(/\./g, '');
    return `${canonicalLocal}@gmail.com`;
  }
  return email;
}

/** Both stored forms an existing row can have: typed-lowercase (legacy) and canonical. */
export function emailCandidates(rawEmail: string): string[] {
  const lower = String(rawEmail).trim().toLowerCase();
  const canonical = canonicalizeEmail(rawEmail);
  return lower === canonical ? [canonical] : [canonical, lower];
}

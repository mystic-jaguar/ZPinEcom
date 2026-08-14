import {
  dropoffOtpFrom,
  generateDropoffOtp,
  hasDroppedOff,
  otpMatches,
  sanitizeReturnHistory,
} from '../utils/returnDropoff';

// The seller's handover code is the only thing standing between a partner and
// closing a return he never delivered, so each rule gets a check here. No
// database: everything lives in the status_history array.
describe('return drop-off OTP', () => {
  const collected = (otp?: string) => ({ status: 'picked_up', at: '2026-08-14T10:00:00Z', ...(otp ? { dropoffOtp: otp } : {}) });

  test('mints a 6-digit code', () => {
    for (let i = 0; i < 50; i++) expect(generateDropoffOtp()).toMatch(/^\d{6}$/);
  });

  test('reads the code off the pickup entry', () => {
    expect(dropoffOtpFrom([{ status: 'approved' }, collected('123456')])).toBe('123456');
  });

  test('a re-collected return is confirmed with the NEWEST code', () => {
    expect(dropoffOtpFrom([collected('111111'), { status: 'rejected' }, collected('222222')])).toBe('222222');
  });

  test('no code on returns collected before this shipped', () => {
    expect(dropoffOtpFrom([collected()])).toBeNull();
    expect(dropoffOtpFrom(null)).toBeNull();
  });

  test('sanitize strips the code but keeps the entry', () => {
    const out = sanitizeReturnHistory([collected('123456')]);
    expect(out[0]).not.toHaveProperty('dropoffOtp');
    expect(out[0].status).toBe('picked_up');
  });

  test('hasDroppedOff blocks a second confirmation', () => {
    expect(hasDroppedOff([collected('123456')])).toBe(false);
    expect(hasDroppedOff([collected('123456'), { status: 'dropped_off' }])).toBe(true);
  });

  test('otpMatches is exact — no trimming into a match, no length oracle crash', () => {
    expect(otpMatches('123456', '123456')).toBe(true);
    expect(otpMatches('123456', ' 123456 ')).toBe(true); // typed with stray spaces
    expect(otpMatches('123456', '123457')).toBe(false);
    expect(otpMatches('123456', '12345')).toBe(false);
    expect(otpMatches(null, '123456')).toBe(false);
    expect(otpMatches('123456', undefined)).toBe(false);
  });
});

import { canonicalizeEmail, emailCandidates } from '../utils/canonicalizeEmail';

describe('canonicalizeEmail (must match website-customer/backend/utils/canonicalizeEmail.js)', () => {
  it('folds Gmail dots, +tags and googlemail', () => {
    expect(canonicalizeEmail(' Rahul.Sharma+shop@GoogleMail.com ')).toBe('rahulsharma@gmail.com');
  });
  it('only lowercases/trims other domains', () => {
    expect(canonicalizeEmail(' A.B+c@Yahoo.com')).toBe('a.b+c@yahoo.com');
  });
  it('candidates cover legacy typed form and canonical form', () => {
    expect(emailCandidates('rahul.sharma@gmail.com')).toEqual(['rahulsharma@gmail.com', 'rahul.sharma@gmail.com']);
    expect(emailCandidates('x@y.com ')).toEqual(['x@y.com']);
  });
});

import { catalogZone, isServiceableAddress, sellerZone, zoneForPincode } from '../src/utils/delivery';

describe('delivery zones', () => {
  test('pincode → zone', () => {
    expect(zoneForPincode('411001')).toBe('pune');
    expect(zoneForPincode(' 412105 ')).toBe('pune');
    expect(zoneForPincode('842004')).toBe('muzaffarpur');
    expect(zoneForPincode('842005')).toBeNull();
    expect(zoneForPincode('110001')).toBeNull();
    expect(zoneForPincode(null)).toBeNull();
  });

  test('address gate: Pune needs city, Muzaffarpur is pincode-only', () => {
    expect(isServiceableAddress('Pimpri', '411018')).toBe(true);
    expect(isServiceableAddress('Mumbai', '411018')).toBe(false);
    expect(isServiceableAddress('anything', '842001')).toBe(true);
    expect(isServiceableAddress('Muzaffarpur', '842010')).toBe(false);
  });

  test('unknown seller pincode counts as Pune', () => {
    expect(sellerZone(null)).toBe('pune');
    expect(sellerZone('560001')).toBe('pune');
    expect(sellerZone('842003')).toBe('muzaffarpur');
  });

  test('catalogue filter', () => {
    expect(catalogZone(undefined)).toEqual({ sql: '', key: '' });
    expect(catalogZone('560001')).toEqual({ sql: ' AND false', key: ':znone' });
    expect(catalogZone('842002').sql).toContain("IN ('842001','842002','842003','842004')");
    expect(catalogZone('411001').sql).toMatch(/^ AND NOT EXISTS/);
    expect(catalogZone("411001'; DROP TABLE x;--").sql).toBe(' AND false');
  });
});

import { describe, expect, it } from 'vitest';
import { networkKeys } from './net';

describe('networkKeys', () => {
  it('groups IPv6 addresses by /64 and /48', () => {
    const a = networkKeys('2001:db8:aa:bb:1::1');
    const b = networkKeys('2001:0db8:00aa:00bb:ffff:ffff:ffff:ffff');
    expect(a).toEqual(b);
    expect(a).toEqual({ host: '6:2001:db8:aa:bb', wide: '6:2001:db8:aa' });
    expect(networkKeys('2001:db8:aa:cc::1').wide).toBe(a.wide);
    expect(networkKeys('::1').host).toBe('6:0:0:0:0');
  });

  it('keeps full IPv4 address and groups by /24', () => {
    expect(networkKeys('203.0.113.7')).toEqual({ host: '4:203.0.113.7', wide: '4:203.0.113' });
  });
});

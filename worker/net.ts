/** IPv6 clients usually own a whole /64 (often a /48), so limiting single addresses is trivially bypassed. */
export function networkKeys(ip: string): { host: string; wide: string } {
  if (ip.includes(':')) {
    const groups = expandIpv6(ip);
    return { host: `6:${groups.slice(0, 4).join(':')}`, wide: `6:${groups.slice(0, 3).join(':')}` };
  }
  return { host: `4:${ip}`, wide: `4:${ip.split('.').slice(0, 3).join('.')}` };
}

function expandIpv6(ip: string): string[] {
  const [head, tail] = ip.toLowerCase().split('::');
  const a = head ? head.split(':') : [];
  const b = tail !== undefined && tail ? tail.split(':') : [];
  const fill = tail === undefined ? [] : Array(Math.max(0, 8 - a.length - b.length)).fill('0');
  return [...a, ...fill, ...b].map((g) => g.replace(/^0+(?=.)/, ''));
}

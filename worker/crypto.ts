const enc = new TextEncoder();

const toHex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const toB64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const fromB64Url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

export async function sha256(input: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', enc.encode(input)));
}

export function randomToken(bytes = 32): string {
  return toB64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function newId(): string {
  return randomToken(12);
}

async function aesKey(pepper: string): Promise<CryptoKey> {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode(`passphrase-enc:${pepper}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(plain: string, pepper: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(pepper), enc.encode(plain));
  return `${toB64Url(iv)}.${toB64Url(new Uint8Array(data))}`;
}

export async function decrypt(blob: string, pepper: string): Promise<string> {
  const [iv, data] = blob.split('.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64Url(iv) }, await aesKey(pepper), fromB64Url(data));
  return new TextDecoder().decode(plain);
}

export const passphraseHash = (normalized: string, pepper: string) => sha256(`passphrase:${pepper}:${normalized}`);
export const tokenHash = (token: string) => sha256(`token:${token}`);
export const recoveryHash = (normalized: string, pepper: string) => sha256(`recovery:${pepper}:${normalized}`);

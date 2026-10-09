export function currencyDigits(currency: string): number {
  return new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMoney(minor: number, currency: string, locale?: string, opts: { sign?: boolean } = {}): string {
  const digits = currencyDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: opts.sign ? 'exceptZero' : 'auto',
  }).format(minor / 10 ** digits);
}

/**
 * Parses user input like "12", "12,5", "1.234,56", "1,234.56" into minor units.
 * With both separators the last one is decimal; a single separator followed by
 * exactly three digits is read as a thousands separator.
 */
export function parseAmount(input: string, currency: string): number | null {
  const digits = currencyDigits(currency);
  if (input.includes('-')) return null;
  const s = input.trim().replace(/[\s'’]/g, '').replace(/^[^\d.,]+|[^\d.,]+$/g, '');
  if (!s || !/^[\d.,]+$/.test(s)) return null;
  const seps = s.match(/[.,]/g) ?? [];
  let decimalAt = -1;
  if (seps.length) {
    const last = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
    const kinds = new Set(seps);
    const tailLen = s.length - last - 1;
    if (kinds.size === 2) {
      if (seps.filter((c) => c === s[last]).length !== 1) return null;
      decimalAt = last;
    }
    else if (seps.length === 1 && !(tailLen === 3 && digits !== 3)) decimalAt = last;
  }
  const intPart = (decimalAt >= 0 ? s.slice(0, decimalAt) : s).replace(/[.,]/g, '');
  const fracPart = decimalAt >= 0 ? s.slice(decimalAt + 1) : '';
  if (/[.,]/.test(fracPart) || fracPart.length > digits) return null;
  if (!intPart && !fracPart) return null;
  const value = Number(intPart || '0') * 10 ** digits + Number(fracPart.padEnd(digits, '0') || '0');
  return Number.isSafeInteger(value) ? value : null;
}

export function toInputString(minor: number, currency: string): string {
  const digits = currencyDigits(currency);
  if (digits === 0) return String(minor);
  const abs = Math.abs(minor);
  const int = Math.floor(abs / 10 ** digits);
  const frac = String(abs % 10 ** digits).padStart(digits, '0');
  return `${minor < 0 ? '-' : ''}${int},${frac}`;
}

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'CAD', 'AUD'] as const;

import { describe, expect, it } from 'vitest';
import { computeBalances, simplifyDebts } from './balances';
import { evaluateAmount, formatMoney, parseAmount } from './money';
import {
  generatePassphrase,
  generateRecoveryCode,
  HABITAT_WORDS,
  isRecoveryShape,
  isLegacyPassphrase,
  isPassphraseShape,
  normalizePassphrase,
  PASSPHRASE_WORDS,
} from './passphrase';
import { allocate, splitExpense } from './split';

describe('evaluateAmount', () => {
  it.each([
    ['12,50 + 8', 2050],
    ['12.5+8×3', 3650],
    ['100 ÷ 3', 3333],
    ['10 - 2,5 * 2', 500],
    ['1.234,56 + 0,44', 123500],
    ['45,90 + ', 4590],
    ['20', 2000],
    ['12€ + 3', 1500],
    ['EUR 10 x 2', 2000],
  ])('%s → %i', (input, expected) => expect(evaluateAmount(input, 'EUR')).toBe(expected));

  it.each(['5 - 10', '10 / 0', '3 + abc'])('rejects %s', (input) => expect(evaluateAmount(input, 'EUR')).toBeNull());
});

describe('parseAmount', () => {
  it.each([
    ['12', 1200],
    ['12,5', 1250],
    ['12.50', 1250],
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1.234', 123400],
    ['€ 7,05', 705],
    ['0,01', 1],
  ])('%s → %i', (input, expected) => expect(parseAmount(input, 'EUR')).toBe(expected));

  it.each(['', 'abc', '-5', '0,500', '0.500', ',500', '1,234,5.6.7', '1,999'.replace('999', '9999')])('rejects %s', (input) => {
    expect(parseAmount(input, 'EUR')).toBeNull();
  });

  it('respects zero-decimal currencies', () => {
    expect(parseAmount('1500', 'JPY')).toBe(1500);
    expect(parseAmount('15,5', 'JPY')).toBeNull();
    expect(formatMoney(1500, 'JPY', 'en')).toBe('¥1,500');
  });
});

describe('splitExpense', () => {
  it('equal split always reconciles to the cent', () => {
    const r = splitExpense(1000, 'equal', [
      { memberId: 'a', value: 1 },
      { memberId: 'b', value: 1 },
      { memberId: 'c', value: 1 },
    ]);
    expect(r.map((x) => x.amount)).toEqual([334, 333, 333]);
  });

  it('shares and percent use largest remainder', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
    const p = splitExpense(999, 'percent', [
      { memberId: 'a', value: 5000 },
      { memberId: 'b', value: 2500 },
      { memberId: 'c', value: 2500 },
    ]);
    expect(p.map((x) => x.amount)).toEqual([499, 250, 250]);
    expect(
      splitExpense(1000, 'shares', [
        { memberId: 'a', value: 2 },
        { memberId: 'b', value: 1 },
      ]).map((x) => x.amount),
    ).toEqual([667, 333]);
  });

  it('validates exact and percent totals', () => {
    expect(() =>
      splitExpense(1000, 'exact', [
        { memberId: 'a', value: 400 },
        { memberId: 'b', value: 500 },
      ]),
    ).toThrow('exact_mismatch');
    expect(() => splitExpense(1000, 'percent', [{ memberId: 'a', value: 5000 }])).toThrow('percent_mismatch');
    expect(() => splitExpense(1000, 'equal', [])).toThrow('no_participants');
    expect(() =>
      splitExpense(1000, 'equal', [
        { memberId: 'a', value: 1 },
        { memberId: 'a', value: 1 },
      ]),
    ).toThrow('duplicate_member');
  });
});

describe('balances', () => {
  it('nets expenses and transfers, then settles with minimal transfers', () => {
    const net = computeBalances(
      ['a', 'b', 'c'],
      [
        {
          kind: 'expense',
          amount: 3000,
          paidBy: 'a',
          splits: [
            { memberId: 'a', amount: 1000 },
            { memberId: 'b', amount: 1000 },
            { memberId: 'c', amount: 1000 },
          ],
        },
        {
          kind: 'expense',
          amount: 600,
          paidBy: 'b',
          splits: [
            { memberId: 'b', amount: 300 },
            { memberId: 'c', amount: 300 },
          ],
        },
        { kind: 'transfer', amount: 500, paidBy: 'c', splits: [{ memberId: 'a', amount: 500 }] },
      ],
    );
    expect(Object.fromEntries(net)).toEqual({ a: 1500, b: -700, c: -800 });
    expect([...net.values()].reduce((x, y) => x + y, 0)).toBe(0);
    expect(simplifyDebts(net)).toEqual([
      { from: 'c', to: 'a', amount: 800 },
      { from: 'b', to: 'a', amount: 700 },
    ]);
  });

  it('returns nothing when everyone is even', () => {
    expect(
      simplifyDebts(
        new Map([
          ['a', 0],
          ['b', 0],
        ]),
      ),
    ).toEqual([]);
  });
});

describe('passphrase', () => {
  it('generates unique-word, normalized passphrases', () => {
    const all = [...PASSPHRASE_WORDS, ...HABITAT_WORDS];
    expect(new Set(all).size).toBe(all.length);
    expect(all.every((w) => /^[a-z]+$/.test(w))).toBe(true);
    const p = generatePassphrase();
    expect(isPassphraseShape(p)).toBe(true);
    expect(normalizePassphrase(p)).toBe(p);
    expect(p.split('-')).toHaveLength(6);
    expect(isLegacyPassphrase(p)).toBe(false);
  });

  it('still accepts legacy three-word passphrases but flags them', () => {
    expect(isPassphraseShape('volpe-koala-gufo-0042')).toBe(true);
    expect(isLegacyPassphrase('Volpe Koala Gufo 0042')).toBe(true);
  });

  it('produces URL-safe passphrases that survive a round trip through a link', () => {
    const p = generatePassphrase();
    expect(p).toMatch(/^[a-z0-9-]+$/);
    expect(encodeURIComponent(p)).toBe(p);
  });

  it('normalizes case, accents and separators', () => {
    expect(normalizePassphrase('  Volpe Koala.GUFO  0042 ')).toBe('volpe-koala-gufo-0042');
    expect(normalizePassphrase('colibrì-ape-orso-1234')).toBe('colibri-ape-orso-1234');
  });
});

describe('recovery code', () => {
  it('is eight words, never a room passphrase', () => {
    const code = generateRecoveryCode();
    expect(code.split('-')).toHaveLength(8);
    expect(isRecoveryShape(code)).toBe(true);
    expect(isPassphraseShape(code)).toBe(false);
    expect(isRecoveryShape(generatePassphrase())).toBe(false);
  });

  it('accepts what people type back', () => {
    expect(isRecoveryShape('Volpe Fiordo  gufo,koala tundra-PALUDE lince Orso')).toBe(true);
    expect(isRecoveryShape('volpe fiordo gufo koala tundra palude lince')).toBe(false);
  });
});

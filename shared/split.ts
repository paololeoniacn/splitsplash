export type SplitMode = 'equal' | 'exact' | 'shares' | 'percent';

export interface SplitEntry {
  memberId: string;
  /** equal: ignored (1). exact: minor units. shares: positive weight. percent: basis points (100% = 10000). */
  value: number;
}

export interface Allocation {
  memberId: string;
  value: number;
  amount: number;
}

export class SplitError extends Error {
  constructor(public code: 'no_participants' | 'exact_mismatch' | 'percent_mismatch' | 'invalid_value' | 'duplicate_member') {
    super(code);
  }
}

/** Largest-remainder allocation: results always sum exactly to `total`; ties go to earlier entries. */
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw new SplitError('invalid_value');
  const raw = weights.map((w) => (total * w) / sum);
  const base = raw.map((r) => Math.floor(r));
  let rest = total - base.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) base[order[k].i] += 1;
  return base;
}

export function splitExpense(total: number, mode: SplitMode, entries: SplitEntry[]): Allocation[] {
  if (!Number.isSafeInteger(total) || total <= 0) throw new SplitError('invalid_value');
  if (entries.length === 0) throw new SplitError('no_participants');
  if (new Set(entries.map((e) => e.memberId)).size !== entries.length) throw new SplitError('duplicate_member');

  switch (mode) {
    case 'equal': {
      const amounts = allocate(total, entries.map(() => 1));
      return entries.map((e, i) => ({ memberId: e.memberId, value: 1, amount: amounts[i] }));
    }
    case 'exact': {
      if (entries.some((e) => !Number.isSafeInteger(e.value) || e.value < 0)) throw new SplitError('invalid_value');
      if (entries.reduce((a, e) => a + e.value, 0) !== total) throw new SplitError('exact_mismatch');
      return entries.map((e) => ({ memberId: e.memberId, value: e.value, amount: e.value }));
    }
    case 'shares':
    case 'percent': {
      if (entries.some((e) => !Number.isFinite(e.value) || e.value < 0)) throw new SplitError('invalid_value');
      if (mode === 'percent' && entries.reduce((a, e) => a + e.value, 0) !== 10000) throw new SplitError('percent_mismatch');
      const amounts = allocate(total, entries.map((e) => e.value));
      return entries.map((e, i) => ({ memberId: e.memberId, value: e.value, amount: amounts[i] }));
    }
  }
}

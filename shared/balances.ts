export interface LedgerItem {
  kind: 'expense' | 'transfer';
  amount: number;
  paidBy: string;
  splits: { memberId: string; amount: number }[];
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

/** Net position per member: positive = is owed money, negative = owes money. */
export function computeBalances(memberIds: string[], items: LedgerItem[]): Map<string, number> {
  const net = new Map<string, number>(memberIds.map((id) => [id, 0]));
  for (const item of items) {
    net.set(item.paidBy, (net.get(item.paidBy) ?? 0) + item.amount);
    for (const s of item.splits) net.set(s.memberId, (net.get(s.memberId) ?? 0) - s.amount);
  }
  return net;
}

/** Greedy settlement: repeatedly match the largest debtor with the largest creditor. */
export function simplifyDebts(net: Map<string, number>): Transfer[] {
  const creditors = [...net].filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }));
  const debtors = [...net].filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }));
  const transfers: Transfer[] = [];
  const byAmount = (a: { id: string; v: number }, b: { id: string; v: number }) => b.v - a.v || a.id.localeCompare(b.id);
  while (creditors.length && debtors.length) {
    creditors.sort(byAmount);
    debtors.sort(byAmount);
    const c = creditors[0];
    const d = debtors[0];
    const amount = Math.min(c.v, d.v);
    transfers.push({ from: d.id, to: c.id, amount });
    c.v -= amount;
    d.v -= amount;
    if (c.v === 0) creditors.shift();
    if (d.v === 0) debtors.shift();
  }
  return transfers;
}

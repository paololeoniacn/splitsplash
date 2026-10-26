import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowRightLeft, CheckCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { simplifyDebts, type Transfer } from '../../shared/balances';
import type { Expense } from '../../shared/types';
import { CATEGORY_ICONS } from '../components/categoryIcon';
import { MiniPortrait, Portrait } from '../components/Portrait';
import { Rosette } from '../components/Guilloche';
import { Button } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { errorKey } from '../i18n';
import { useToast } from '../components/Toast';
import { todayISO } from '../lib/format';
import { activityKey, expensesKey } from '../lib/useRoom';
import { useRoomCtx } from './Room';

function useDateLabel() {
  const { t, i18n } = useTranslation();
  return (iso: string) => {
    const today = todayISO();
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    if (iso === today) return t('room.today');
    if (iso === yesterday) return t('room.yesterday');
    const [yy, mm, dd] = iso.split('-').map(Number);
    return new Date(yy, mm - 1, dd).toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
      year: yy === new Date().getFullYear() ? undefined : 'numeric',
    });
  };
}

export function ExpensesTab() {
  const { expenses, byId, state, money, openExpense } = useRoomCtx();
  const { t } = useTranslation();
  const dateLabel = useDateLabel();

  const groups = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map];
  }, [expenses]);

  if (!expenses.length) {
    return (
      <div className="flex flex-col items-center py-14 text-center">
        <div className="relative">
          <Rosette size={120} className="text-rule" lines={11} />
          <span className="absolute inset-0 grid place-items-center text-4xl" aria-hidden="true">
            🦦
          </span>
        </div>
        <h2 className="mt-5 text-xl font-bold">{t('room.emptyTitle')}</h2>
        <p className="mt-2 max-w-[32ch] text-ink-2">{t('room.emptyBody')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      {groups.map(([date, items]) => (
        <section key={date} aria-label={dateLabel(date)}>
          <h2 className="microprint mb-1.5">{dateLabel(date)}</h2>
          <ul className="divide-y divide-rule">
            {items.map((e) => {
              const payer = byId.get(e.paidBy);
              const mine = e.splits.find((s) => s.memberId === state.me)?.amount;
              const Icon = CATEGORY_ICONS[e.category] ?? CATEGORY_ICONS.other;
              if (e.kind === 'transfer') {
                const to = byId.get(e.splits[0]?.memberId);
                return (
                  <li key={e.id}>
                    <button onClick={() => openExpense(e)} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-ink/3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-dashed border-rule">
                        <ArrowRightLeft className="size-4 text-ink-2" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {payer && <MiniPortrait animal={payer.animal} ink={payer.ink} size={22} />}
                          <span className="truncate">{payer?.id === state.me ? t('room.youShort') : payer?.name}</span>
                          <ArrowRight className="size-3.5 shrink-0 text-ink-2" aria-hidden="true" />
                          {to && <MiniPortrait animal={to.animal} ink={to.ink} size={22} />}
                          <span className="truncate">{to?.id === state.me ? t('room.youShort') : to?.name}</span>
                        </span>
                        <span className="block truncate text-sm text-ink-2">{e.note || t('room.transfer')}</span>
                      </span>
                      <span className="num shrink-0 font-semibold text-ink-2">{money(e.amount)}</span>
                    </button>
                  </li>
                );
              }
              return (
                <li key={e.id}>
                  <button onClick={() => openExpense(e)} className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-ink/3">
                    <span className="relative shrink-0">
                      {payer && <MiniPortrait animal={payer.animal} ink={payer.ink} size={40} />}
                      <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-raised ring-1 ring-rule">
                        <Icon className="size-3 text-ink-2" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block truncate text-sm text-ink-2">
                        {payer?.id === state.me ? t('room.youPaid') : t('room.paidBy', { name: payer?.name ?? '?' })}
                        {e.note ? ` · ${e.note}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="num block font-bold">{money(e.amount)}</span>
                      <span className="num block text-[13px] text-ink-2">
                        {mine !== undefined ? t('room.yourShare', { amount: money(mine) }) : t('room.notInvolved')}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function BalancesTab() {
  const { balances, byId, state, money } = useRoomCtx();
  const { roomId = '' } = useParams();
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [stamped, setStamped] = useState<string | null>(null);

  const transfers = useMemo(() => simplifyDebts(balances), [balances]);
  const mine = transfers.filter((x) => x.from === state.me || x.to === state.me);
  const others = transfers.filter((x) => x.from !== state.me && x.to !== state.me);
  const keyOf = (x: Transfer) => `${x.from}>${x.to}`;

  const settle = useMutation({
    mutationFn: (x: Transfer) =>
      api.createExpense(roomId, {
        kind: 'transfer',
        title: t('expense.transferTitle'),
        note: '',
        category: 'other',
        amount: x.amount,
        paidBy: x.from,
        date: todayISO(),
        split: { mode: 'equal', entries: [{ memberId: x.to, value: 1 }] },
      }),
    onSuccess: (_r, x) => {
      setStamped(keyOf(x));
      setTimeout(() => {
        setStamped(null);
        void qc.invalidateQueries({ queryKey: expensesKey(roomId) });
        void qc.invalidateQueries({ queryKey: activityKey(roomId) });
      }, 1100);
    },
  });

  const toast = useToast();
  const [confirmAll, setConfirmAll] = useState(false);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: expensesKey(roomId) });
    void qc.invalidateQueries({ queryKey: activityKey(roomId) });
  };
  const settleAll = useMutation({
    mutationFn: () => api.settleAll(roomId, { title: t('expense.transferTitle'), date: todayISO(), transfers }),
    onSuccess: (r) => {
      setConfirmAll(false);
      setStamped('all');
      toast({ text: t('balances.settledAll', { count: r.count }) });
      setTimeout(() => {
        setStamped(null);
        refresh();
      }, 1100);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'balances_changed') refresh();
    },
  });
  const totalToSettle = transfers.reduce((s, x) => s + x.amount, 0);
  const isStamped = (x: Transfer) => stamped === 'all' || stamped === keyOf(x);

  const name = (id: string) => (id === state.me ? t('room.youShort') : (byId.get(id)?.name ?? '?'));

  const lead = mine[0];
  const members = [...state.members].sort((a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0));

  return (
    <div className="grid grid-cols-1 gap-9">
      {lead ? (
        <TransferCard x={lead} lead stamped={isStamped(lead)} pending={settle.isPending && settle.variables === lead} onSettle={() => settle.mutate(lead)} />
      ) : (
        <div className="flex items-center gap-4 rounded-note bg-owed-wash px-5 py-5">
          <Portrait animal={byId.get(state.me)?.animal ?? 'otter'} ink={byId.get(state.me)?.ink ?? 2} size={60} />
          <div>
            <p className="text-lg font-bold text-owed">{transfers.length ? t('balances.youreEven') : t('balances.allSettled')}</p>
            <p className="text-ink-2">{transfers.length ? t('balances.youreEvenBody') : t('balances.allSettledBody')}</p>
          </div>
        </div>
      )}

      {transfers.length > (lead ? 1 : 0) && (
        <section>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold">{t('balances.suggested')}</h2>
              <p className="text-sm text-ink-2">{t('balances.suggestedHint')}</p>
            </div>
            {transfers.length > 1 && !confirmAll && (
              <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setConfirmAll(true)} disabled={stamped !== null}>
                <CheckCheck className="size-4" aria-hidden="true" />
                {t('balances.settleAll')}
              </Button>
            )}
          </div>
          {confirmAll && (
            <div className="mb-3 grid gap-3 rounded-xl px-5 py-4 ring-1 ring-rule" role="group" aria-label={t('balances.settleAll')}>
              <p className="font-semibold">{t('balances.settleAllConfirm', { count: transfers.length, amount: money(totalToSettle) })}</p>
              <p className="text-sm text-ink-2">{t('balances.settleAllHint')}</p>
              {settleAll.error && (
                <p className="text-sm text-owe" role="alert">
                  {t(errorKey(settleAll.error instanceof ApiError ? settleAll.error.code : 'generic'))}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setConfirmAll(false);
                    settleAll.reset();
                  }}
                  disabled={settleAll.isPending}
                >
                  {t('balances.cancel')}
                </Button>
                <Button onClick={() => settleAll.mutate()} loading={settleAll.isPending}>
                  <CheckCheck className="size-4" aria-hidden="true" />
                  {t('balances.settleAllGo')}
                </Button>
              </div>
            </div>
          )}
          <ul className="grid grid-cols-1 gap-2">
            {[...mine.slice(1), ...others].map((x) => (
              <li key={keyOf(x)}>
                <TransferCard x={x} stamped={isStamped(x)} pending={settle.isPending && settle.variables === x} onSettle={() => settle.mutate(x)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">{t('balances.perMember')}</h2>
        <ul className="divide-y divide-rule">
          {members.map((m) => {
            const net = balances.get(m.id) ?? 0;
            const max = Math.max(1, ...[...balances.values()].map(Math.abs));
            return (
              <li key={m.id} className="grid grid-cols-[auto_minmax(0,1fr)_7.5rem] items-center gap-3 py-3">
                <MiniPortrait animal={m.animal} ink={m.ink} size={34} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{name(m.id)}</p>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-ink/6" aria-hidden="true">
                    <div className={`h-full rounded-full ${net >= 0 ? 'bg-owed' : 'bg-owe'}`} style={{ width: `${(Math.abs(net) / max) * 100}%` }} />
                  </div>
                </div>
                <p className="text-right">
                  <span className={`num block font-bold ${net > 0 ? 'text-owed' : net < 0 ? 'text-owe' : 'text-ink-2'}`}>{money(Math.abs(net))}</span>
                  <span className="block text-[13px] text-ink-2">{net > 0 ? t('balances.isOwed') : net < 0 ? t('balances.owes') : t('balances.even')}</span>
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );

  function TransferCard({
    x,
    lead = false,
    stamped,
    pending,
    onSettle,
  }: {
    x: Transfer;
    lead?: boolean;
    stamped: boolean;
    pending: boolean;
    onSettle: () => void;
  }) {
    const from = byId.get(x.from)!;
    const to = byId.get(x.to)!;
    const iOwe = x.from === state.me;
    const owedToMe = x.to === state.me;
    const headline = iOwe
      ? t('balances.youOwe', { name: to.name, amount: money(x.amount) })
      : owedToMe
        ? t('balances.owesYou', { name: from.name, amount: money(x.amount) })
        : null;
    return (
      <div
        className={`relative overflow-hidden rounded-note ${lead ? (iOwe ? 'bg-owe-wash' : 'bg-owed-wash') + ' px-5 py-5' : 'bg-raised px-4 py-3.5 ring-1 ring-rule'}`}
      >
        <div className={lead ? 'sm:flex sm:items-center sm:gap-6' : ''}>
          <div className={`flex flex-1 items-center gap-3 ${stamped ? 'opacity-40 transition-opacity duration-500' : ''}`}>
            <div className="flex shrink-0 items-center">
              {lead ? (
                <Portrait key={`f${stamped}`} animal={from.animal} ink={from.ink} size={52} draw={stamped} />
              ) : (
                <MiniPortrait animal={from.animal} ink={from.ink} size={34} />
              )}
              <ArrowRight className="mx-1 size-4 text-ink-2" aria-hidden="true" />
              {lead ? (
                <Portrait key={`t${stamped}`} animal={to.animal} ink={to.ink} size={52} draw={stamped} />
              ) : (
                <MiniPortrait animal={to.animal} ink={to.ink} size={34} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {headline ? (
                <p className={`font-bold text-balance ${lead ? 'text-lg' : ''} ${iOwe ? 'text-owe' : 'text-owed'}`}>{headline}</p>
              ) : (
                <p className="font-semibold">
                  {name(x.from)} <span className="font-normal text-ink-2">{t('balances.pays')}</span> {name(x.to)}
                </p>
              )}
              {!headline && <p className="num text-sm font-bold">{money(x.amount)}</p>}
            </div>
            {!lead && (
              <Button size="sm" variant="secondary" onClick={onSettle} loading={pending} disabled={stamped}>
                {t('balances.markPaid')}
              </Button>
            )}
          </div>
          {lead && (
            <div className="mt-4 sm:mt-0 sm:shrink-0">
              <Button className="w-full sm:w-auto sm:min-w-48" onClick={onSettle} loading={pending} disabled={stamped}>
                {t('balances.markPaid')}
              </Button>
            </div>
          )}
        </div>
        {stamped && (
          <span className="pointer-events-none absolute inset-0 grid place-items-center" aria-live="polite">
            <CancelMark label={t('balances.stamp')} date={new Date().toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' })} />
          </span>
        )}
      </div>
    );
  }
}

export function ActivityTab() {
  const { byId, state, money } = useRoomCtx();
  const { roomId = '' } = useParams();
  const { t, i18n } = useTranslation();
  const q = useInfiniteQuery({
    queryKey: activityKey(roomId),
    queryFn: ({ pageParam }) => api.activity(roomId, pageParam),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.activity.at(-1)?.createdAt : undefined),
  });
  const items = q.data?.pages.flatMap((p) => p.activity) ?? [];
  const fmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (q.isSuccess && !items.length) return <p className="py-10 text-center text-ink-2">{t('activity.empty')}</p>;

  return (
    <div>
      <ol className="relative grid grid-cols-1 gap-0.5 before:absolute before:top-3 before:bottom-3 before:left-[15px] before:w-px before:bg-rule">
        {items.map((a) => {
          const who = a.memberId ? byId.get(a.memberId) : undefined;
          const p = a.payload as { title?: string; name?: string; amount?: number; count?: number };
          return (
            <li key={a.id} className="relative flex items-start gap-3 py-2.5">
              {who ? <MiniPortrait animal={who.animal} ink={who.ink} size={31} /> : <span className="size-[31px] rounded-full bg-rule" />}
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="leading-snug [overflow-wrap:anywhere]">
                  {t(`activity.${a.type}`, {
                    context: who?.id === state.me ? 'you' : undefined,
                    who: who ? (who.id === state.me ? t('room.youShort') : who.name) : t('activity.someone'),
                    title: p.title,
                    name: p.name,
                    count: p.count,
                  })}
                  {typeof p.amount === 'number' && <span className="num font-semibold"> · {money(p.amount)}</span>}
                </p>
                <p className="text-[13px] text-ink-2">{fmt.format(a.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {q.hasNextPage && (
        <Button variant="ghost" className="mt-3 w-full" onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
          {t('activity.more')}
        </Button>
      )}
    </div>
  );
}

/** Inked cancellation mark printed across a settled transfer. */
function CancelMark({ label, date }: { label: string; date: string }) {
  return (
    <svg viewBox="0 0 240 92" className="stamp-in w-56 text-owed mix-blend-multiply dark:mix-blend-screen" role="img" aria-label={label}>
      <defs>
        <filter id="ink-bleed">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.2" />
        </filter>
      </defs>
      <g filter="url(#ink-bleed)" fill="none" stroke="currentColor">
        <rect x="4" y="4" width="232" height="84" rx="10" strokeWidth="3.5" />
        <rect x="11" y="11" width="218" height="70" rx="6" strokeWidth="1.2" />
        <text
          x="120"
          y="52"
          textAnchor="middle"
          fill="currentColor"
          stroke="none"
          fontFamily="var(--font-mono)"
          fontWeight="600"
          fontSize="27"
          letterSpacing="5"
        >
          {label.toUpperCase()}
        </text>
        <text x="120" y="70" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="var(--font-mono)" fontSize="9" letterSpacing="2.5">
          {`· ${date.toUpperCase()} · SPLITSPLASH ·`}
        </text>
      </g>
    </svg>
  );
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, type Category } from '../../shared/categories';
import { evaluateAmount, hasThousandsReading, isExpression, parseAmount, toInputString } from '../../shared/money';
import { splitExpense, type SplitEntry, type SplitMode } from '../../shared/split';
import type { Expense, Member } from '../../shared/types';
import { errorKey } from '../i18n';
import { api, ApiError } from '../lib/api';
import { todayISO, useMoney } from '../lib/format';
import { activityKey, expensesKey } from '../lib/useRoom';
import { CATEGORY_ICONS } from './categoryIcon';
import { MiniPortrait } from './Portrait';
import { useEggWord } from '../lib/easterEgg';
import { BunnyPop } from './BunnyPop';
import { Sheet } from './Sheet';
import { useToast } from './Toast';
import { Button, Field, inputClass, Segmented } from './ui';

export interface ExpenseDraft {
  kind: 'expense' | 'transfer';
  from?: string;
  to?: string;
  amount?: number;
}

const num = (s: string) => {
  const v = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(v) && v >= 0 ? v : null;
};

export function ExpenseSheet({
  open,
  onClose,
  roomId,
  currency,
  members,
  me,
  expense,
  draft,
}: {
  open: boolean;
  onClose: () => void;
  roomId: string;
  currency: string;
  members: Member[];
  me: string;
  expense?: Expense | null;
  draft?: ExpenseDraft | null;
}) {
  const { t } = useTranslation();
  const money = useMoney(currency);
  const qc = useQueryClient();
  const toast = useToast();

  const [kind, setKind] = useState<'expense' | 'transfer'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Category>('food');
  const [paidBy, setPaidBy] = useState(me);
  const [to, setTo] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [bunny, setBunny] = useState(false);
  useEggWord(title, () => setBunny(true));
  useEggWord(note, () => setBunny(true));
  const [mode, setMode] = useState<SplitMode>('equal');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    if (expense) {
      setKind(expense.kind);
      setAmountStr(toInputString(expense.amount, currency));
      setTitle(expense.title);
      setCategory(expense.category);
      setPaidBy(expense.paidBy);
      setDate(expense.date);
      setNote(expense.note);
      setMode(expense.kind === 'transfer' ? 'equal' : expense.splitMode);
      setTo(expense.kind === 'transfer' ? (expense.splits[0]?.memberId ?? '') : '');
      setSelected(new Set(expense.splits.map((s) => s.memberId)));
      setValues(
        Object.fromEntries(
          expense.splits.map((s) => [
            s.memberId,
            expense.splitMode === 'exact' ? toInputString(s.value, currency) : expense.splitMode === 'percent' ? String(s.value / 100) : String(s.value),
          ]),
        ),
      );
    } else {
      const k = draft?.kind ?? 'expense';
      setKind(k);
      setAmountStr(draft?.amount ? toInputString(draft.amount, currency) : '');
      setTitle(k === 'transfer' ? t('expense.transferTitle') : '');
      setCategory(k === 'transfer' ? 'other' : 'food');
      setPaidBy(draft?.from ?? me);
      setTo(draft?.to ?? members.find((m) => m.id !== (draft?.from ?? me))?.id ?? '');
      setDate(todayISO());
      setNote('');
      setMode('equal');
      setSelected(new Set(members.map((m) => m.id)));
      setValues({});
    }
  }, [open, expense, draft, currency, me, members, t]);

  const amount = evaluateAmount(amountStr, currency);
  const amountRef = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current === null) return;
    amountRef.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [amountStr]);
  const insertOperator = (op: string) => {
    const el = amountRef.current;
    const start = el?.selectionStart ?? amountStr.length;
    const end = el?.selectionEnd ?? amountStr.length;
    const before = amountStr.slice(0, start).replace(/[+−×÷\s]+$/, '');
    if (!before) return;
    const next = before + op + amountStr.slice(end);
    caret.current = before.length + 1;
    setAmountStr(next);
  };
  const resolveAmount = () => {
    if (isExpression(amountStr) && amount) setAmountStr(toInputString(amount, currency));
  };

  const entries: SplitEntry[] | null = useMemo(() => {
    const ids = members.filter((m) => selected.has(m.id)).map((m) => m.id);
    if (mode === 'equal') return ids.map((id) => ({ memberId: id, value: 1 }));
    const out: SplitEntry[] = [];
    for (const id of ids) {
      const raw = values[id] ?? '';
      if (mode === 'exact') {
        const v = raw.trim() ? parseAmount(raw, currency) : 0;
        if (v === null) return null;
        out.push({ memberId: id, value: v });
      } else {
        const v = raw.trim() ? num(raw) : mode === 'shares' ? 1 : 0;
        if (v === null) return null;
        out.push({ memberId: id, value: mode === 'percent' ? Math.round(v * 100) : v });
      }
    }
    return out;
  }, [members, selected, mode, values, currency]);

  const preview = useMemo(() => {
    if (kind === 'transfer' || !amount || !entries?.length) return null;
    try {
      return new Map(splitExpense(amount, mode, entries).map((a) => [a.memberId, a.amount]));
    } catch {
      return null;
    }
  }, [kind, amount, entries, mode]);

  const balanceHint = (() => {
    if (kind === 'transfer' || !entries || !amount) return null;
    if (mode === 'exact') {
      const diff = amount - entries.reduce((a, e) => a + e.value, 0);
      return diff === 0
        ? { ok: true, text: t('expense.balanced') }
        : { ok: false, text: diff > 0 ? t('expense.remaining', { amount: money(diff) }) : t('expense.over', { amount: money(-diff) }) };
    }
    if (mode === 'percent') {
      const diff = 10000 - entries.reduce((a, e) => a + e.value, 0);
      return diff === 0
        ? { ok: true, text: t('expense.balanced') }
        : { ok: false, text: diff > 0 ? t('expense.percentLeft', { value: diff / 100 }) : t('expense.percentOver', { value: -diff / 100 }) };
    }
    if (mode === 'equal' && entries.length) return { ok: true, text: t('expense.each', { amount: money(Math.floor(amount / entries.length)) }) };
    return null;
  })();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: expensesKey(roomId) });
    void qc.invalidateQueries({ queryKey: activityKey(roomId) });
  };

  const save = useMutation({
    mutationFn: () => {
      const body = {
        kind,
        title: title.trim(),
        note: note.trim(),
        category: kind === 'transfer' ? ('other' as const) : category,
        amount: amount!,
        paidBy,
        date,
        split: kind === 'transfer' ? { mode: 'equal' as const, entries: [{ memberId: to, value: 1 }] } : { mode, entries: entries! },
      };
      return expense ? api.updateExpense(roomId, expense.id, body) : api.createExpense(roomId, body);
    },
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  const remove = useMutation({
    mutationFn: () => api.deleteExpense(roomId, expense!.id),
    onSuccess: () => {
      invalidate();
      onClose();
      const id = expense!.id;
      toast({ text: t('expense.deleted'), action: { label: t('expense.undo'), run: () => api.restoreExpense(roomId, id).then(invalidate) } });
    },
  });

  const canSave = !!amount && !!title.trim() && (kind === 'transfer' ? !!to && to !== paidBy : !!preview);

  const submit = () => {
    setSubmitted(true);
    if (canSave) save.mutate();
  };

  const sheetTitle = expense ? t('expense.edit') : kind === 'transfer' ? t('expense.newTransfer') : t('expense.new');

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={sheetTitle}
      footer={
        <div className="flex items-center gap-3">
          {expense && (
            <Button variant="danger" onClick={() => remove.mutate()} loading={remove.isPending} aria-label={t('expense.delete')}>
              <Trash2 className="size-4" aria-hidden="true" />
              <span className="max-sm:sr-only">{t('expense.delete')}</span>
            </Button>
          )}
          <Button size="lg" className="flex-1" onClick={submit} loading={save.isPending}>
            {save.isPending ? t('expense.saving') : t('expense.save')}
          </Button>
        </div>
      }
    >
      <form
        className="grid grid-cols-1 gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {!expense && (
          <Segmented
            label={t('expense.kindExpense')}
            value={kind}
            onChange={(k) => {
              setKind(k);
              if (k === 'transfer' && (!title || title === '')) setTitle(t('expense.transferTitle'));
              if (k === 'expense' && title === t('expense.transferTitle')) setTitle('');
            }}
            options={[
              { value: 'expense', label: t('expense.kindExpense') },
              { value: 'transfer', label: t('expense.kindTransfer') },
            ]}
          />
        )}

        <div>
          <label htmlFor="amount" className="text-sm font-semibold">
            {t('expense.amount')}
          </label>
          <div className="mt-1.5 flex items-baseline gap-2 border-b-2 border-ink pb-1 focus-within:border-owe">
            <span className="text-2xl font-semibold text-ink-2">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency')?.value}
            </span>
            <input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={amountStr}
              ref={amountRef}
              onChange={(e) => setAmountStr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === '=') (e.preventDefault(), resolveAmount());
              }}
              autoFocus={!expense}
              aria-invalid={submitted && !amount ? true : undefined}
              className="amount-field num w-full min-w-0 bg-transparent text-[2.75rem] leading-none font-bold tracking-[-0.03em] outline-none placeholder:text-ink-2/40"
            />
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            {(
              [
                ['+', 'add'],
                ['−', 'subtract'],
                ['×', 'multiply'],
                ['÷', 'divide'],
              ] as const
            ).map(([op, key]) => (
              <button
                key={op}
                type="button"
                aria-label={t(`expense.calc.${key}`)}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => insertOperator(op)}
                className="grid size-10 place-items-center rounded-full text-xl font-semibold ring-1 ring-rule transition-colors hover:bg-ink/5 active:bg-ink/10"
              >
                {op}
              </button>
            ))}
            <button
              type="button"
              aria-label={t('expense.calc.equals')}
              onPointerDown={(e) => e.preventDefault()}
              onClick={resolveAmount}
              disabled={!isExpression(amountStr) || !amount}
              className="grid size-10 place-items-center rounded-full text-xl font-semibold ring-1 ring-rule transition-colors hover:bg-ink/5 active:bg-ink/10 disabled:opacity-35"
            >
              =
            </button>
            {(isExpression(amountStr) || hasThousandsReading(amountStr)) && (
              <output htmlFor="amount" aria-live="polite" className={`num ml-auto truncate pl-2 text-lg font-bold ${amount ? 'text-ink' : 'text-owe'}`}>
                {amount ? `= ${money(amount)}` : t('expense.calc.invalid')}
              </output>
            )}
          </div>
          {submitted && !amount && (
            <p className="mt-1.5 text-sm text-owe" role="alert">
              {t('errors.amount')}
            </p>
          )}
        </div>

        {kind === 'expense' && (
          <Field label={t('expense.title')} id="title" error={submitted && !title.trim() ? t('errors.required') : undefined}>
            <input
              id="title"
              className={inputClass}
              placeholder={t('expense.titlePh')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              aria-invalid={submitted && !title.trim() ? true : undefined}
            />
          </Field>
        )}

        {kind === 'expense' && (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t('expense.category')}</legend>
            <div className="relative -mx-5 flex gap-2 overflow-x-auto overscroll-x-contain px-5 py-1.5 -my-1.5">
              {CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c];
                const on = c === category;
                return (
                  <label
                    key={c}
                    className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ink ${on ? 'bg-ink text-paper ring-ink' : 'ring-rule hover:ring-ink/40'}`}
                  >
                    <input type="radio" name="category" className="sr-only" checked={on} onChange={() => setCategory(c)} />
                    <Icon className="size-4" aria-hidden="true" />
                    {t(`expense.categories.${c}`)}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        <MemberChoice
          label={kind === 'transfer' ? t('expense.from') : t('expense.paidBy')}
          members={members}
          me={me}
          value={paidBy}
          onChange={setPaidBy}
          name="paidBy"
        />

        {kind === 'transfer' ? (
          <>
            <MemberChoice label={t('expense.to')} members={members.filter((m) => m.id !== paidBy)} me={me} value={to} onChange={setTo} name="to" />
            {submitted && (!to || to === paidBy) && <p className="-mt-3 text-sm text-owe">{t('errors.invalid_transfer')}</p>}
          </>
        ) : (
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold">{t('expense.split')}</legend>
            <Segmented
              label={t('expense.split')}
              value={mode}
              onChange={setMode}
              options={(['equal', 'exact', 'shares', 'percent'] as const).map((m) => ({ value: m, label: t(`expense.modes.${m}`) }))}
            />
            <p className="text-sm text-ink-2">{t(`expense.modeHelp.${mode}`)}</p>
            <div className="flex justify-end gap-1 text-sm">
              <button
                type="button"
                className="rounded-full px-2.5 py-1 font-semibold text-ink-2 hover:text-ink"
                onClick={() => setSelected(new Set(members.map((m) => m.id)))}
              >
                {t('expense.all')}
              </button>
              <button type="button" className="rounded-full px-2.5 py-1 font-semibold text-ink-2 hover:text-ink" onClick={() => setSelected(new Set())}>
                {t('expense.none')}
              </button>
            </div>
            <ul className="divide-y divide-rule rounded-note ring-1 ring-rule">
              {members.map((m) => {
                const on = selected.has(m.id);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <label className="flex flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const next = new Set(selected);
                          if (on) next.delete(m.id);
                          else next.add(m.id);
                          setSelected(next);
                        }}
                        className="size-5 accent-[var(--ink)]"
                      />
                      <MiniPortrait animal={m.animal} ink={m.ink} size={30} />
                      <span className={`font-medium ${on ? '' : 'text-ink-2'}`}>
                        {m.name}
                        {m.id === me && <span className="text-ink-2"> · {t('room.you')}</span>}
                      </span>
                    </label>
                    {on && mode !== 'equal' && (
                      <span className="flex items-center gap-1">
                        <input
                          inputMode="decimal"
                          aria-label={`${m.name} ${t(`expense.modes.${mode}`)}`}
                          placeholder={mode === 'shares' ? '1' : '0'}
                          value={values[m.id] ?? ''}
                          onChange={(e) => setValues({ ...values, [m.id]: e.target.value })}
                          className="num h-9 w-20 rounded-lg bg-paper px-2 text-right ring-1 ring-rule outline-none focus:ring-2 focus:ring-ink"
                        />
                        {mode === 'percent' && <span className="text-sm text-ink-2">%</span>}
                      </span>
                    )}
                    <span className={`num w-20 text-right text-sm ${on ? 'font-semibold' : 'text-ink-2'}`}>
                      {on && preview?.has(m.id) ? money(preview.get(m.id)!) : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
            {balanceHint && (
              <p className={`text-sm font-semibold ${balanceHint.ok ? 'text-owed' : 'text-owe'}`} role="status">
                {balanceHint.text}
              </p>
            )}
            {submitted && selected.size === 0 && <p className="text-sm text-owe">{t('errors.no_participants')}</p>}
          </fieldset>
        )}

        <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3">
          <Field label={t('expense.date')} id="date">
            <input id="date" type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label={t('expense.note')} id="note">
            <input id="note" className={inputClass} placeholder={t('expense.notePh')} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
          </Field>
        </div>

        {(save.error || remove.error) && (
          <p role="alert" className="rounded-xl bg-owe-wash px-4 py-3 text-sm text-owe">
            {t(errorKey(((save.error ?? remove.error) as ApiError).code ?? 'generic'))}
          </p>
        )}
        <button type="submit" hidden />
      </form>
      <BunnyPop open={bunny} onClose={() => setBunny(false)} />
    </Sheet>
  );
}

function MemberChoice({
  label,
  members,
  me,
  value,
  onChange,
  name,
}: {
  label: string;
  members: Member[];
  me: string;
  value: string;
  onChange: (id: string) => void;
  name: string;
}) {
  const { t } = useTranslation();
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="relative -mx-5 flex gap-2 overflow-x-auto overscroll-x-contain px-5 py-1.5 -my-1.5">
        {members.map((m) => {
          const on = m.id === value;
          return (
            <label
              key={m.id}
              className={`ink-${m.ink} flex shrink-0 cursor-pointer items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-semibold ring-1 transition-all has-focus-visible:outline-2 has-focus-visible:outline-ink ${on ? 'bg-wash text-on-wash ring-2 ring-line' : 'ring-rule hover:ring-ink/40'}`}
            >
              <input type="radio" name={name} className="sr-only" checked={on} onChange={() => onChange(m.id)} />
              <MiniPortrait animal={m.animal} ink={m.ink} size={28} />
              {m.id === me ? t('room.youShort') : m.name}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

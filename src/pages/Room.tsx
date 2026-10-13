import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Languages, LogOut, Plus, Settings2, UserPlus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Navigate, Outlet, useNavigate, useOutletContext, useParams } from 'react-router';
import { ANIMALS } from '../../shared/animals';
import { computeBalances } from '../../shared/balances';
import { toggleLanguage } from '../i18n';
import type { Expense, Member, RoomState } from '../../shared/types';
import { AnimalPicker } from '../components/AnimalPicker';
import { ExpenseSheet, type ExpenseDraft } from '../components/ExpenseSheet';
import { GuillocheBand } from '../components/Guilloche';
import { Portrait } from '../components/Portrait';
import { Serial } from '../components/Serial';
import { Sheet } from '../components/Sheet';
import { Button, IconButton, TextInput } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { useMoney } from '../lib/format';
import { forgetRoom, tokenFor, touchRoom } from '../lib/storage';
import { activityKey, roomKey, useExpenses, useRoom } from '../lib/useRoom';
import { VersionFooter } from '../components/VersionFooter';
import { isLegacyPassphrase } from '../../shared/passphrase';

export interface RoomCtx {
  state: RoomState;
  expenses: Expense[];
  balances: Map<string, number>;
  byId: Map<string, Member>;
  money: (n: number, o?: { sign?: boolean }) => string;
  openExpense: (e: Expense) => void;
  openDraft: (d: ExpenseDraft) => void;
}

export const useRoomCtx = () => useOutletContext<RoomCtx>();

export default function Room() {
  const { roomId = '' } = useParams();
  const { t } = useTranslation();
  const room = useRoom(roomId);
  const expenses = useExpenses(roomId);
  const [sheet, setSheet] = useState<{ expense?: Expense | null; draft?: ExpenseDraft | null } | null>(null);
  const [menu, setMenu] = useState(false);
  const money = useMoney(room.data?.room.currency ?? 'EUR');

  useEffect(() => {
    if (room.data) touchRoom(roomId, room.data.room.name);
  }, [room.data, roomId]);

  const balances = useMemo(
    () =>
      computeBalances(
        room.data?.members.map((m) => m.id) ?? [],
        (expenses.data ?? []).map((e) => ({ kind: e.kind, amount: e.amount, paidBy: e.paidBy, splits: e.splits })),
      ),
    [room.data, expenses.data],
  );

  if (!tokenFor(roomId) || (room.error instanceof ApiError && room.error.status === 401)) {
    return <NoAccess />;
  }
  if (room.error && !room.data) {
    return (
      <Centered>
        <p className="text-lg font-semibold">{t('room.loadError')}</p>
        <Button className="mt-4" onClick={() => room.refetch()}>
          {t('room.retry')}
        </Button>
      </Centered>
    );
  }
  if (!room.data) return <RoomSkeleton />;

  const { room: r, members, me } = room.data;
  const byId = new Map(members.map((m) => [m.id, m]));
  const total = (expenses.data ?? []).filter((e) => e.kind === 'expense').reduce((a, e) => a + e.amount, 0);
  const ctx: RoomCtx = {
    state: room.data,
    expenses: expenses.data ?? [],
    balances,
    byId,
    money,
    openExpense: (e) => setSheet({ expense: e }),
    openDraft: (d) => setSheet({ draft: d }),
  };
  const ordered = [byId.get(me)!, ...members.filter((m) => m.id !== me)].filter(Boolean);

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col pb-32">
      <header className="sticky top-0 z-20 bg-paper/92 backdrop-blur-md">
        <div className="flex items-center justify-between px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1 sm:px-5">
          <Link to="/" aria-label={t('menu.home')} className="inline-grid size-10 place-items-center rounded-full hover:bg-ink/6">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to={`/r/${roomId}/invite`}
              className="inline-flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold ring-1 ring-rule transition-colors hover:ring-ink/40"
            >
              <UserPlus className="size-4" aria-hidden="true" />
              {t('room.invite')}
            </Link>
            <IconButton label={t('room.menu')} onClick={() => setMenu(true)}>
              <Settings2 className="size-5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      </header>

      <section className="px-5 pt-3">
        <div className="flex items-end justify-between gap-4">
          <h1 className="min-w-0 text-[clamp(1.75rem,6vw,2.5rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-balance break-words">{r.name}</h1>
          <div className="shrink-0 text-right">
            <p className="microprint">{t('room.total')}</p>
            <p className="num text-[clamp(1.5rem,5vw,2rem)] leading-tight font-extrabold tracking-[-0.02em]">{money(total)}</p>
          </div>
        </div>
        {room.data.passphrase && (
          <Link
            to={`/r/${roomId}/invite`}
            className="mt-2 inline-flex items-center gap-2 rounded-md text-owe transition-opacity hover:opacity-75"
            aria-label={t('room.invite')}
          >
            <span className="microprint text-ink-2">{t('invite.serial')}</span>
            <Serial value={room.data.passphrase} className="text-sm font-semibold" />
            {isLegacyPassphrase(room.data.passphrase) && (
              <span className="microprint rounded-full px-2 py-0.5 ring-1 ring-rule">{t('invite.legacyShort')}</span>
            )}
          </Link>
        )}
        <div className={`ink-${byId.get(me)?.ink ?? 0} mt-3 text-line/55`}>
          <GuillocheBand height={16} lines={5} />
        </div>
      </section>

      <section aria-label={t('balances.perMember')} className="mt-4">
        <ul className="flex gap-1 overflow-x-auto px-3 pb-2 sm:px-5">
          {ordered.map((m) => {
            const net = balances.get(m.id) ?? 0;
            return (
              <li key={m.id} className="flex w-[5.75rem] shrink-0 flex-col items-center text-center">
                <Portrait animal={m.animal} ink={m.ink} size={68} />
                <span className="mt-1.5 w-full truncate text-sm font-semibold">{m.id === me ? t('room.youShort') : m.name}</span>
                <span className={`num text-[15px] font-bold ${net > 0 ? 'text-owed' : net < 0 ? 'text-owe' : 'text-ink-2'}`}>
                  {net === 0 ? t('room.settled') : money(net, { sign: true })}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <nav
        className="sticky top-[calc(3rem+env(safe-area-inset-top))] z-10 mt-2 border-b border-rule bg-paper/92 px-5 backdrop-blur-md"
        aria-label={t('room.menu')}
      >
        <ul className="flex gap-6">
          {(
            [
              ['', 'expenses'],
              ['balances', 'balances'],
              ['activity', 'activity'],
            ] as const
          ).map(([path, key]) => (
            <li key={key}>
              <NavLink
                to={path}
                end
                className={({ isActive }) =>
                  `relative inline-block py-3 text-[15px] font-semibold transition-colors ${isActive ? 'text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-ink' : 'text-ink-2 hover:text-ink'}`
                }
              >
                {t(`room.tabs.${key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <main className="flex-1 px-5 pt-4">
        <Outlet context={ctx} />
      </main>
      <VersionFooter className="px-5" />

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Button
          size="lg"
          className="pointer-events-auto shadow-[0_14px_30px_-10px_rgb(16_32_27/0.65)]"
          onClick={() => setSheet({ draft: { kind: 'expense' } })}
        >
          <Plus className="size-5" aria-hidden="true" />
          {t('room.add')}
        </Button>
      </div>

      <ExpenseSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        roomId={roomId}
        currency={r.currency}
        members={members}
        me={me}
        expense={sheet?.expense}
        draft={sheet?.draft}
      />
      <RoomMenu open={menu} onClose={() => setMenu(false)} roomId={roomId} state={room.data} />
    </div>
  );
}

function RoomMenu({ open, onClose, roomId, state }: { open: boolean; onClose: () => void; roomId: string; state: RoomState }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const meMember = state.members.find((m) => m.id === state.me)!;
  const [view, setView] = useState<'main' | 'add' | 'profile'>('main');
  const [name, setName] = useState('');
  const [animal, setAnimal] = useState('');

  useEffect(() => {
    if (open) setView('main');
  }, [open]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: roomKey(roomId) });
    void qc.invalidateQueries({ queryKey: activityKey(roomId) });
  };

  const add = useMutation({ mutationFn: () => api.addMember(roomId, { name: name.trim(), animal }), onSuccess: () => (refresh(), onClose()) });
  const update = useMutation({ mutationFn: () => api.updateMe(roomId, { name: name.trim(), animal }), onSuccess: () => (refresh(), onClose()) });

  const freeAnimal = () => {
    const taken = new Set(state.members.map((m) => m.animal));
    const pool = ANIMALS.filter((a) => !taken.has(a.id));
    return (pool.length ? pool : ANIMALS)[Math.floor(Math.random() * (pool.length || ANIMALS.length))].id;
  };
  const leave = async () => {
    if (!confirm(t('menu.leaveConfirm'))) return;
    await api.leave(roomId).catch(() => {});
    forgetRoom(roomId);
    navigate('/', { replace: true });
  };

  const taken = state.members.map((m) => m.animal);
  const titles = { main: state.room.name, add: t('menu.addMember'), profile: t('menu.profile') };

  return (
    <Sheet open={open} onClose={onClose} title={titles[view]}>
      {view === 'main' && (
        <ul className="-mx-2 grid">
          {[
            { icon: Users, label: t('menu.invite'), run: () => navigate(`/r/${roomId}/invite`) },
            { icon: UserPlus, label: t('menu.addMember'), run: () => (setName(''), setAnimal(freeAnimal()), setView('add')) },
            { icon: Settings2, label: t('menu.profile'), run: () => (setName(meMember.name), setAnimal(meMember.animal), setView('profile')) },
            { icon: Languages, label: t('app.lang'), run: toggleLanguage },
            { icon: LogOut, label: t('menu.leave'), run: leave, danger: true },
          ].map((item) => (
            <li key={item.label}>
              <button
                onClick={item.run}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3.5 text-left font-semibold transition-colors hover:bg-ink/5 ${item.danger ? 'text-owe' : ''}`}
              >
                <item.icon className="size-5" aria-hidden="true" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {view !== 'main' && (
        <form
          className="grid gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !animal) return;
            if (view === 'add') add.mutate();
            else update.mutate();
          }}
        >
          {view === 'add' && <p className="-mt-1 text-sm text-ink-2">{t('menu.addMemberHint')}</p>}
          <TextInput label={t('menu.name')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
          <AnimalPicker
            label={t('create.animal')}
            value={animal}
            onChange={setAnimal}
            taken={view === 'add' ? taken : taken.filter((a) => a !== meMember.animal)}
            ink={view === 'add' ? state.members.length % 6 : meMember.ink}
          />
          <Button type="submit" size="lg" loading={add.isPending || update.isPending} disabled={!name.trim() || !animal}>
            {view === 'add' ? t('menu.add') : t('menu.save')}
          </Button>
        </form>
      )}
    </Sheet>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">{children}</div>
      <VersionFooter />
    </div>
  );
}

function NoAccess() {
  const { t } = useTranslation();
  const { roomId = '' } = useParams();
  useEffect(() => forgetRoom(roomId), [roomId]);
  return (
    <Centered>
      <Portrait animal="owl" ink={3} size={96} />
      <p className="mt-5 text-lg font-semibold text-balance">{t('room.notFound')}</p>
      <Link to="/join" className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-5 font-semibold text-paper">
        {t('room.notFoundCta')}
      </Link>
    </Centered>
  );
}

function RoomSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-5 pt-16" aria-busy="true">
      <div className="h-9 w-2/3 rounded-lg bg-ink/8" />
      <div className="mt-8 flex gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="size-16 rounded-full bg-ink/8" />
        ))}
      </div>
      <div className="mt-10 grid gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-note bg-ink/6" />
        ))}
      </div>
    </div>
  );
}

export function RedirectHome() {
  return <Navigate to="/" replace />;
}

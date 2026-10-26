import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronRight, Copy, Fingerprint, KeyRound, LogOut, RefreshCw, ShieldAlert, Trash2, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { isRecoveryShape } from '../../shared/passphrase';
import { GuillocheBand } from '../components/Guilloche';
import { Portrait } from '../components/Portrait';
import { Serial } from '../components/Serial';
import { FormShell } from '../components/Shell';
import { useToast } from '../components/Toast';
import { Button, IconButton, TextInput } from '../components/ui';
import { errorKey } from '../i18n';
import { api, ApiError } from '../lib/api';
import { forgetVault, savedRooms, vaultToken } from '../lib/storage';
import { addPasskey, createVault, openWithCode, openWithPasskey, passkeySupported, syncLocalRooms } from '../lib/vault';

const errText = (t: (k: string) => string, e: unknown) => (e ? t(errorKey(e instanceof ApiError ? e.code : 'generic')) : undefined);

function ErrorLine({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-owe">
      {errText(t, error)}
    </p>
  );
}

export default function Keyring() {
  const [open, setOpen] = useState(() => !!vaultToken());
  const [fresh, setFresh] = useState<{ code: string; skipped: boolean } | null>(null);

  if (fresh) return <RecoveryCode code={fresh.code} skipped={fresh.skipped} onDone={() => setFresh(null)} />;
  if (open) return <Manage onClosed={() => setOpen(false)} onNewCode={(code) => setFresh({ code, skipped: false })} />;
  return (
    <Setup
      onCreated={(code, skipped) => {
        setOpen(true);
        setFresh({ code, skipped });
      }}
    />
  );
}

function Setup({ onCreated }: { onCreated: (code: string, skipped: boolean) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const rooms = savedRooms();
  const supported = passkeySupported();
  const [code, setCode] = useState('');

  const create = useMutation({
    mutationFn: async () => {
      const recovery = await createVault();
      let skipped = !supported;
      if (supported) await addPasskey().catch(() => (skipped = true));
      return { recovery, skipped };
    },
    onSuccess: ({ recovery, skipped }) => onCreated(recovery, skipped),
  });

  const recovered = (count: number) => {
    toast({ text: t('keys.restored', { count }) });
    navigate('/', { replace: true });
  };
  const withPasskey = useMutation({ mutationFn: openWithPasskey, onSuccess: recovered });
  const withCode = useMutation({ mutationFn: openWithCode, onSuccess: recovered });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (isRecoveryShape(code)) withCode.mutate(code);
  };

  return (
    <FormShell title={t('keys.title')}>
      <p className="-mt-4 mb-10 text-lg leading-relaxed text-ink-2">{t('keys.lede')}</p>

      {rooms.length > 0 && (
        <section aria-labelledby="keys-save" className="mb-12 grid grid-cols-1 gap-4 border-b border-rule pb-12">
          <h2 id="keys-save" className="text-xl font-bold tracking-[-0.02em]">
            {t('keys.saveTitle')}
          </h2>
          <p className="text-ink-2">{t('keys.saveCount', { count: rooms.length })}</p>
          <Button size="lg" loading={create.isPending} onClick={() => create.mutate()}>
            <KeyRound className="size-5" aria-hidden="true" />
            {supported ? t('keys.create') : t('keys.createNoPasskey')}
          </Button>
          {!supported && <p className="text-sm text-ink-2">{t('keys.unsupported')}</p>}
          <ErrorLine error={create.error} />
        </section>
      )}

      <section aria-labelledby="keys-recover" className="grid grid-cols-1 gap-4">
        <h2 id="keys-recover" className="text-xl font-bold tracking-[-0.02em]">
          {t('keys.recoverTitle')}
        </h2>
        <p className="text-ink-2">{t('keys.recoverLede')}</p>
        {supported && (
          <>
            <Button size="lg" variant={rooms.length ? 'secondary' : 'primary'} loading={withPasskey.isPending} onClick={() => withPasskey.mutate()}>
              <Fingerprint className="size-5" aria-hidden="true" />
              {t('keys.recoverPasskey')}
            </Button>
            <ErrorLine error={withPasskey.error} />
          </>
        )}
        <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4" noValidate>
          <TextInput
            label={t('keys.codeLabel')}
            hint={t('keys.codeHint')}
            placeholder={t('keys.codePh')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-[17px]"
            error={errText(t, withCode.error)}
          />
          <Button type="submit" variant="secondary" loading={withCode.isPending} disabled={!isRecoveryShape(code)}>
            {t('keys.codeGo')}
          </Button>
        </form>
      </section>
    </FormShell>
  );
}

function RecoveryCode({ code, skipped, onDone }: { code: string; skipped: boolean; onDone: () => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <FormShell title={t('keys.codeTitle')} back={null}>
      <p className="-mt-4 mb-8 text-lg leading-relaxed text-ink-2">{t('keys.codeLede')}</p>

      <div className="overflow-hidden rounded-note bg-raised shadow-[0_24px_50px_-28px_rgb(16_32_27/0.5),0_1px_4px_rgb(16_32_27/0.08)]">
        <div className="ink-5 text-line/60">
          <GuillocheBand height={26} />
        </div>
        <div className="px-6 py-6">
          <p className="microprint">{t('keys.codeLabel')}</p>
          <p className="mt-2 text-[clamp(1.2rem,5.4vw,1.6rem)] leading-snug font-semibold text-owe">
            <Serial value={code} mint />
          </p>
          <Button
            className="mt-5"
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
          >
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? t('keys.copied') : t('keys.copy')}
          </Button>
        </div>
        <p className="flex items-start gap-3 border-t border-dashed border-rule px-6 py-4 text-sm text-ink-2">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-owe" aria-hidden="true" />
          {t('keys.codeWarn')}
        </p>
      </div>

      {skipped && <p className="mt-6 text-sm text-ink-2">{t('keys.passkeySkipped')}</p>}

      <label className="mt-8 flex items-start gap-3">
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        <span className="font-medium">{t('keys.saved')}</span>
      </label>
      <Button size="lg" className="mt-6 w-full" disabled={!saved} onClick={onDone}>
        {t('keys.continue')}
      </Button>
    </FormShell>
  );
}

function Manage({ onClosed, onNewCode }: { onClosed: () => void; onNewCode: (code: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const supported = passkeySupported();
  const local = new Set(savedRooms().map((r) => r.roomId));

  const info = useQuery({
    queryKey: ['vault'],
    queryFn: async () => {
      await syncLocalRooms().catch(() => {});
      return api.vault();
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['vault'] });

  useEffect(() => {
    if (info.error instanceof ApiError && info.error.status === 401) onClosed();
  }, [info.error, onClosed]);

  const unlink = useMutation({ mutationFn: (roomId: string) => api.vaultUnlink(roomId), onSuccess: refresh });
  const add = useMutation({
    mutationFn: addPasskey,
    onSuccess: () => {
      toast({ text: t('keys.passkeyAdded') });
      void refresh();
    },
  });
  const restore = useMutation({
    mutationFn: openWithPasskey,
    onSuccess: (count) => {
      toast({ text: t('keys.restored', { count }) });
      void refresh();
    },
  });
  const newCode = useMutation({ mutationFn: api.vaultNewCode, onSuccess: (r) => onNewCode(r.recoveryCode) });
  const close = (text: string) => {
    forgetVault();
    qc.removeQueries({ queryKey: ['vault'] });
    toast({ text });
    onClosed();
  };
  const signOut = useMutation({ mutationFn: api.vaultSignOut, onSettled: () => close(t('keys.signedOut')) });
  const remove = useMutation({ mutationFn: api.vaultDelete, onSuccess: () => close(t('keys.deleted')) });

  const rooms = info.data?.rooms ?? [];
  const missing = rooms.some((r) => !local.has(r.roomId));

  return (
    <FormShell title={t('keys.title')}>
      <p className="-mt-4 mb-10 text-lg leading-relaxed text-ink-2">{t('keys.lede')}</p>

      <section aria-labelledby="keys-rooms" className="grid grid-cols-1 gap-3">
        <h2 id="keys-rooms" className="text-xl font-bold tracking-[-0.02em]">
          {t('keys.roomsTitle')}
        </h2>
        {info.isPending ? (
          <div className="h-32 animate-pulse rounded-note bg-rule/50" />
        ) : rooms.length === 0 ? (
          <p className="text-ink-2">{t('keys.roomsEmpty')}</p>
        ) : (
          <ul className="grid grid-cols-1 divide-y divide-rule border-y border-rule">
            {rooms.map((r) => {
              const here = local.has(r.roomId);
              const body = (
                <>
                  <Portrait animal={r.member.animal} ink={r.member.ink} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.roomName}</span>
                    <span className="block truncate text-sm text-ink-2">{here ? t('keys.as', { name: r.member.name }) : t('keys.notHere')}</span>
                  </span>
                </>
              );
              return (
                <li key={r.roomId} className="flex items-center gap-2 py-3">
                  {here ? (
                    <Link to={`/r/${r.roomId}`} className="flex min-w-0 flex-1 items-center gap-3.5 transition-colors hover:text-ink-2">
                      {body}
                      <ChevronRight className="size-5 shrink-0 text-ink-2" aria-hidden="true" />
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-3.5 opacity-70">{body}</div>
                  )}
                  <IconButton label={t('keys.unlink', { room: r.roomName })} onClick={() => unlink.mutate(r.roomId)} disabled={unlink.isPending}>
                    <X className="size-4 text-ink-2" aria-hidden="true" />
                  </IconButton>
                </li>
              );
            })}
          </ul>
        )}
        {missing && supported && (
          <Button variant="secondary" loading={restore.isPending} onClick={() => restore.mutate()}>
            <Fingerprint className="size-4" aria-hidden="true" />
            {t('keys.restore')}
          </Button>
        )}
        <ErrorLine error={info.error ?? unlink.error ?? restore.error} />
      </section>

      <section aria-labelledby="keys-passkeys" className="mt-12 grid grid-cols-1 gap-3 border-t border-rule pt-10">
        <h2 id="keys-passkeys" className="text-xl font-bold tracking-[-0.02em]">
          {t('keys.passkeysTitle')}
        </h2>
        {info.data && <p className="text-ink-2">{info.data.passkeys ? t('keys.passkeysCount', { count: info.data.passkeys }) : t('keys.passkeysNone')}</p>}
        {supported ? (
          <Button variant="secondary" loading={add.isPending} onClick={() => add.mutate()}>
            <KeyRound className="size-4" aria-hidden="true" />
            {t('keys.addPasskey')}
          </Button>
        ) : (
          <p className="text-sm text-ink-2">{t('keys.unsupported')}</p>
        )}
        <ErrorLine error={add.error} />
      </section>

      <section aria-labelledby="keys-safety" className="mt-12 grid grid-cols-1 justify-items-start gap-1 border-t border-rule pt-10">
        <h2 id="keys-safety" className="mb-2 text-xl font-bold tracking-[-0.02em]">
          {t('keys.safety')}
        </h2>
        <Button variant="ghost" className="-ml-4" loading={newCode.isPending} onClick={() => confirm(t('keys.newCodeConfirm')) && newCode.mutate()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {t('keys.newCode')}
        </Button>
        <Button variant="ghost" className="-ml-4" loading={signOut.isPending} onClick={() => signOut.mutate()}>
          <LogOut className="size-4" aria-hidden="true" />
          {t('keys.signOut')}
        </Button>
        <Button variant="danger" className="-ml-4" loading={remove.isPending} onClick={() => confirm(t('keys.deleteConfirm')) && remove.mutate()}>
          <Trash2 className="size-4" aria-hidden="true" />
          {t('keys.delete')}
        </Button>
        <ErrorLine error={newCode.error ?? remove.error} />
      </section>
    </FormShell>
  );
}

import { useMutation } from '@tanstack/react-query';
import { ChevronRight, UserPlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { normalizePassphrase } from '../../shared/passphrase';
import { AnimalPicker } from '../components/AnimalPicker';
import { Portrait } from '../components/Portrait';
import { FormShell } from '../components/Shell';
import { Button, TextInput } from '../components/ui';
import { errorKey } from '../i18n';
import { api, ApiError, type LookupResult } from '../lib/api';
import { saveRoom } from '../lib/storage';
import { ANIMALS, INK_COUNT } from '../../shared/animals';

const errText = (t: (k: string) => string, e: unknown) => (e ? t(errorKey(e instanceof ApiError ? e.code : 'generic')) : undefined);

export default function Join() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [passphrase, setPassphrase] = useState(() => decodeURIComponent(location.hash.slice(1)));
  const [found, setFound] = useState<LookupResult | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [name, setName] = useState('');
  const [animal, setAnimal] = useState('');

  const lookup = useMutation({ mutationFn: (p: string) => api.lookup(p), onSuccess: setFound });

  useEffect(() => {
    if (location.hash.length > 1) {
      history.replaceState(null, '', location.pathname);
      lookup.mutate(passphrase);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = useMutation({
    mutationFn: (body: { memberId: string } | { member: { name: string; animal: string } }) => api.join({ passphrase, ...body }),
    onSuccess: (res) => {
      saveRoom({ roomId: res.roomId, token: res.token, name: found!.room.name });
      navigate(`/r/${res.roomId}`, { replace: true });
    },
  });

  if (!found) {
    const submit = (e: FormEvent) => {
      e.preventDefault();
      if (normalizePassphrase(passphrase)) lookup.mutate(passphrase);
    };
    return (
      <FormShell title={t('join.title')}>
        <form onSubmit={submit} className="grid gap-6">
          <TextInput
            label={t('join.passphrase')}
            hint={t('join.passphraseHint')}
            placeholder={t('join.passphrasePh')}
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            className="font-mono text-[17px]"
            error={errText(t, lookup.error)}
          />
          <Button type="submit" size="lg" loading={lookup.isPending} disabled={!normalizePassphrase(passphrase)}>
            {t('join.find')}
          </Button>
        </form>
      </FormShell>
    );
  }

  const takenAnimals = found.members.map((m) => m.animal);
  const nextInk = found.members.length % INK_COUNT;

  return (
    <FormShell title={t('join.whoAreYou', { room: found.room.name })}>
      {!isNew ? (
        <div className="grid grid-cols-1 gap-6">
          {found.members.length > 0 && (
            <div>
              <p className="mb-3 text-ink-2">{t('join.pickExisting')}</p>
              <ul className="grid grid-cols-1 gap-2">
                {found.members.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => join.mutate({ memberId: m.id })}
                      disabled={join.isPending}
                      className="flex w-full items-center gap-4 rounded-note bg-raised p-3 pr-4 text-left ring-1 ring-rule transition-all hover:ring-ink/40 disabled:opacity-50"
                    >
                      <Portrait animal={m.animal} ink={m.ink} size={52} />
                      <span className="flex-1">
                        <span className="block font-semibold">{m.name}</span>
                        {m.claimed && <span className="block text-sm text-ink-2">{t('join.onAnotherDevice')}</span>}
                      </span>
                      <ChevronRight className="size-5 text-ink-2" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Button size="lg" variant={found.members.length ? 'secondary' : 'primary'} onClick={() => {
              const free = ANIMALS.filter((a) => !takenAnimals.includes(a.id));
              const pool = free.length ? free : ANIMALS;
              setAnimal((cur) => cur || pool[Math.floor(Math.random() * pool.length)].id);
              setIsNew(true);
            }}>
            <UserPlus className="size-5" aria-hidden="true" />
            {t('join.newHere')}
          </Button>
          {join.error && <p role="alert" className="text-sm text-owe">{errText(t, join.error)}</p>}
        </div>
      ) : (
        <form
          className="grid gap-6"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim() && animal) join.mutate({ member: { name: name.trim(), animal } });
          }}
        >
          <TextInput label={t('create.yourName')} placeholder={t('create.yourNamePh')} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus autoComplete="given-name" />
          <AnimalPicker label={t('create.animal')} value={animal} onChange={setAnimal} taken={takenAnimals} ink={nextInk} />
          {join.error && <p role="alert" className="text-sm text-owe">{errText(t, join.error)}</p>}
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsNew(false)}>
              {t('join.back')}
            </Button>
            <Button type="submit" size="lg" className="flex-1" loading={join.isPending} disabled={!name.trim() || !animal}>
              {t('join.enter')}
            </Button>
          </div>
        </form>
      )}
    </FormShell>
  );
}

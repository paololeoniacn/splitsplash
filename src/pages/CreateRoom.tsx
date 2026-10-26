import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CURRENCIES } from '../../shared/money';
import { AnimalPicker } from '../components/AnimalPicker';
import { FormShell } from '../components/Shell';
import { Button, Field, inputClass, TextInput } from '../components/ui';
import { errorKey } from '../i18n';
import { api, ApiError } from '../lib/api';
import { saveRoom } from '../lib/storage';
import { linkToVault } from '../lib/vault';

export default function CreateRoom() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(i18n.language === 'en' && navigator.language === 'en-GB' ? 'GBP' : 'EUR');
  const [me, setMe] = useState('');
  const [animal, setAnimal] = useState('fox');
  const [touched, setTouched] = useState(false);

  const create = useMutation({
    mutationFn: () => api.createRoom({ name: name.trim(), currency, member: { name: me.trim(), animal } }),
    onSuccess: (res) => {
      saveRoom({ roomId: res.roomId, token: res.token, name: name.trim() });
      linkToVault(res.token);
      navigate(`/r/${res.roomId}/invite?new=1`, { replace: true });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (name.trim() && me.trim()) create.mutate();
  };

  return (
    <FormShell title={t('create.title')}>
      <form onSubmit={submit} className="grid gap-6" noValidate>
        <TextInput label={t('create.roomName')} placeholder={t('create.roomNamePh')} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoFocus error={touched && !name.trim() ? t('errors.required') : undefined} />
        <Field label={t('create.currency')} id="currency">
          <select id="currency" className={inputClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} · {new Intl.DisplayNames([i18n.language], { type: 'currency' }).of(c)}
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-2 grid gap-6 border-t border-rule pt-6">
          <h2 className="text-lg font-bold">{t('create.you')}</h2>
          <TextInput label={t('create.yourName')} placeholder={t('create.yourNamePh')} value={me} onChange={(e) => setMe(e.target.value)} maxLength={40} autoComplete="given-name" error={touched && !me.trim() ? t('errors.required') : undefined} />
          <AnimalPicker label={t('create.animal')} value={animal} onChange={setAnimal} />
        </div>

        {create.error && (
          <p role="alert" className="rounded-xl bg-owe-wash px-4 py-3 text-sm text-owe">
            {t(errorKey(create.error instanceof ApiError ? create.error.code : 'generic'))}
          </p>
        )}
        <Button type="submit" size="lg" loading={create.isPending} className="mt-2">
          {t('create.submit')}
        </Button>
      </form>
    </FormShell>
  );
}

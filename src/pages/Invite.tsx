import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, Copy, Link2, RefreshCw, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';
import { GuillocheBand } from '../components/Guilloche';
import { Serial } from '../components/Serial';
import { FormShell } from '../components/Shell';
import { useToast } from '../components/Toast';
import { Button } from '../components/ui';
import { api, ApiError } from '../lib/api';
import { errorKey } from '../i18n';
import { isLegacyPassphrase } from '../../shared/passphrase';
import { tokenFor } from '../lib/storage';
import { roomKey, useRoom } from '../lib/useRoom';

export default function Invite() {
  const { roomId = '' } = useParams();
  const [params] = useSearchParams();
  const isNew = params.get('new') === '1';
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const qc = useQueryClient();
  const room = useRoom(roomId);
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState('');
  const [minted, setMinted] = useState(isNew);
  const [confirming, setConfirming] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(false);

  const passphrase = room.data?.passphrase ?? '';
  const link = `${location.origin}/join#${passphrase}`;

  useEffect(() => {
    if (!passphrase) return;
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    QRCode.toString(link, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: dark ? '#e6ece6' : '#10201b', light: '#0000' } }).then(setQr);
  }, [link, passphrase]);

  const rotate = useMutation({
    mutationFn: () => api.rotatePassphrase(roomId, signOutOthers),
    onSuccess: () => {
      setMinted(true);
      setConfirming(false);
      setSignOutOthers(false);
      void qc.invalidateQueries({ queryKey: roomKey(roomId) });
      toast({ text: t('invite.rotated') });
    },
  });

  if (!tokenFor(roomId)) return <Navigate to="/join" replace />;

  const copy = async (text: string, msg: string) => {
    await navigator.clipboard.writeText(text);
    toast({ text: msg });
  };

  return (
    <FormShell title={t('invite.title')} back={isNew ? null : `/r/${roomId}`}>
      <p className="-mt-4 mb-8 text-lg text-ink-2">{t('invite.lede', { room: room.data?.room.name ?? '…' })}</p>

      <div className="overflow-hidden rounded-note bg-raised shadow-[0_24px_50px_-28px_rgb(16_32_27/0.5),0_1px_4px_rgb(16_32_27/0.08)]">
        <div className="ink-1 text-line/60">
          <GuillocheBand height={26} />
        </div>
        <div className="px-6 py-6">
          <p className="microprint">{t('invite.serial')}</p>
          <p className="mt-2 min-h-[2.6em] text-[clamp(1.35rem,6vw,1.75rem)] leading-tight font-semibold text-owe">
            {passphrase ? <Serial key={passphrase} value={passphrase} mint={minted} /> : <span className="text-ink-2">··· ··· ··· ····</span>}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="primary"
              disabled={!passphrase}
              onClick={async () => {
                await navigator.clipboard.writeText(passphrase);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
            >
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? t('invite.copied') : t('invite.copy')}
            </Button>
            {'share' in navigator && (
              <Button
                variant="secondary"
                disabled={!passphrase}
                onClick={() =>
                  navigator.share({ title: 'SplitSplash', text: t('invite.shareText', { room: room.data?.room.name, passphrase }), url: link }).catch(() => {})
                }
              >
                <Share2 className="size-4" aria-hidden="true" />
                {t('invite.share')}
              </Button>
            )}
            <Button variant="secondary" disabled={!passphrase} onClick={() => copy(link, t('invite.linkCopied'))}>
              <Link2 className="size-4" aria-hidden="true" />
              {t('invite.copyLink')}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-5 border-t border-dashed border-rule px-6 py-5">
          <div className="size-28 shrink-0 [&_svg]:size-full" role="img" aria-label={t('invite.qr')} dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="text-sm text-ink-2">{t('invite.qr')}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-3">
        <Button size="lg" onClick={() => navigate(`/r/${roomId}`)}>
          {t('invite.enter')}
          <ArrowRight className="size-5" aria-hidden="true" />
        </Button>
        {!isNew && passphrase && isLegacyPassphrase(passphrase) && !confirming && (
          <p className="mt-2 rounded-xl px-4 py-3 text-sm text-ink-2 ring-1 ring-rule">{t('invite.legacy')}</p>
        )}
        {!isNew && !confirming && (
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            <RefreshCw className="size-4" aria-hidden="true" />
            {t('invite.rotate')}
          </Button>
        )}
        {!isNew && confirming && (
          <div className="mt-2 grid gap-4 rounded-xl px-5 py-4 ring-1 ring-rule" role="group" aria-label={t('invite.rotate')}>
            <p className="font-semibold">{t('invite.rotateConfirm')}</p>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 size-5 shrink-0 accent-[var(--ink)]"
                checked={signOutOthers}
                onChange={(e) => setSignOutOthers(e.target.checked)}
              />
              <span>
                <span className="block font-medium text-ink">{t('invite.rotateSignOut')}</span>
                <span className="block text-ink-2">{t('invite.rotateSignOutHint')}</span>
              </span>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={rotate.isPending}>
                {t('invite.cancel')}
              </Button>
              <Button variant="primary" loading={rotate.isPending} onClick={() => rotate.mutate()}>
                <RefreshCw className="size-4" aria-hidden="true" />
                {t('invite.rotateGo')}
              </Button>
            </div>
            {rotate.error && (
              <p className="text-sm text-owe" role="alert">
                {t(errorKey((rotate.error as ApiError).code ?? 'generic'))}
              </p>
            )}
          </div>
        )}
      </div>
    </FormShell>
  );
}

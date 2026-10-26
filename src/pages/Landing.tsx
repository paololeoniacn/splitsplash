import { ArrowRight, Check, ChevronRight, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { generatePassphrase } from '../../shared/passphrase';
import { GuillocheBand } from '../components/Guilloche';
import { LanguageToggle } from '../components/LanguageToggle';
import { Portrait } from '../components/Portrait';
import { Serial } from '../components/Serial';
import { Button } from '../components/ui';
import { Wordmark } from '../components/Wordmark';
import { useMoney } from '../lib/format';
import { savedRooms } from '../lib/storage';
import { VersionFooter } from '../components/VersionFooter';
import { SOURCE_URL } from '../lib/links';
import { useMemo } from 'react';

const SPECIMEN = [
  { animal: 'fox', ink: 0, name: 'Giulia', net: 8420 },
  { animal: 'octopus', ink: 3, name: 'Marco', net: -5210 },
  { animal: 'otter', ink: 2, name: 'Sara', net: -3210 },
];

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const money = useMoney('EUR');
  const rooms = savedRooms();
  const specimenSerial = useMemo(() => generatePassphrase(), []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col px-5 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Wordmark />
        <LanguageToggle />
      </header>

      <main className="grid flex-1 items-center gap-12 pt-6 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-0">
        <section className="rise max-w-xl">
          <h1 className="text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance">{t('landing.title')}</h1>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink-2">{t('landing.lede')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => navigate('/new')}>
              {t('landing.create')}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/join')}>
              <KeyRound className="size-5" aria-hidden="true" />
              {t('landing.haveCode')}
            </Button>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-ink-2" aria-label={t('landing.manifesto.label')}>
            {(t('landing.perks', { returnObjects: true }) as string[]).map((p) => (
              <li key={p} className="flex items-center gap-1.5">
                <Check className="size-4 text-owed" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>

          {rooms.length > 0 && (
            <nav aria-labelledby="your-rooms" className="mt-10">
              <h2 id="your-rooms" className="text-sm font-semibold text-ink-2">
                {t('landing.yourRooms')}
              </h2>
              <ul className="mt-2 divide-y divide-rule border-y border-rule">
                {rooms.map((r) => (
                  <li key={r.roomId}>
                    <Link to={`/r/${r.roomId}`} className="flex items-center justify-between gap-3 py-3.5 font-semibold transition-colors hover:text-ink-2">
                      <span className="truncate">{r.name}</span>
                      <ChevronRight className="size-5 shrink-0 text-ink-2" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </section>

        <section aria-label={t('landing.specimen')} className="relative">
          <SpecimenNote serial={specimenSerial} money={money} />
        </section>
      </main>

      <section className="grid gap-6 border-t border-rule py-10 sm:grid-cols-3">
        {[
          { animal: 'koala', ink: 5, text: t('landing.how1') },
          { animal: 'penguin', ink: 1, text: t('landing.how2') },
          { animal: 'bee', ink: 0, text: t('landing.how3') },
        ].map((s) => (
          <div key={s.animal} className="flex items-start gap-3.5">
            <Portrait animal={s.animal} ink={s.ink} size={44} />
            <p className="pt-1 leading-snug">{s.text}</p>
          </div>
        ))}
      </section>
      <section aria-labelledby="manifesto" className="border-t border-rule py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <p className="microprint">{t('landing.manifesto.label')}</p>
            <h2 id="manifesto" className="mt-3 text-[clamp(2rem,5vw,3.25rem)] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance">
              {t('landing.manifesto.title')}
            </h2>
            <p className="mt-4 max-w-[44ch] text-lg leading-relaxed text-ink-2">{t('landing.manifesto.lede')}</p>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener"
              className="mt-6 inline-flex items-center gap-2 font-semibold underline decoration-rule decoration-2 underline-offset-4 transition-colors hover:decoration-ink"
            >
              {t('landing.manifesto.source')}
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          <ol className="divide-y divide-rule border-y border-rule">
            {(t('landing.manifesto.points', { returnObjects: true }) as [string, string][]).map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 py-5">
                <span className="num pt-0.5 font-mono text-sm font-semibold text-owe">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3 className="font-bold">{title}</h3>
                  <p className="mt-1 leading-relaxed text-ink-2">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <p className="text-sm text-ink-2">{t('landing.privacy')}</p>
      <VersionFooter className="pb-8" />
    </div>
  );
}

function SpecimenNote({ serial, money }: { serial: string; money: (n: number, o?: { sign?: boolean }) => string }) {
  const { t } = useTranslation();
  return (
    <div className="relative mx-auto max-w-md rotate-[-1.5deg] overflow-hidden rounded-note bg-raised shadow-[0_30px_60px_-30px_rgb(16_32_27/0.45),0_2px_6px_rgb(16_32_27/0.08)] transition-transform duration-700 ease-out-expo hover:rotate-0 lg:max-w-none">
      <div className="ink-3 text-line/70">
        <GuillocheBand height={34} />
      </div>
      <div className="px-6 pt-4 pb-6 sm:px-7">
        <p className="microprint text-right">{t('invite.serial')}</p>
        <div className="mt-1 flex items-baseline justify-between gap-4">
          <p className="text-xl font-bold tracking-[-0.015em]">{t('landing.specimenRoom')}</p>
          <Serial value={serial} mint className="text-right text-[13px] font-semibold text-owe" />
        </div>

        <ul className="mt-6 grid grid-cols-3 gap-3">
          {SPECIMEN.map((m) => (
            <li key={m.animal} className="flex flex-col items-center text-center">
              <Portrait animal={m.animal} ink={m.ink} size={84} draw />
              <span className="mt-2 text-sm font-semibold">{m.name}</span>
              <span className={`num text-sm font-semibold ${m.net > 0 ? 'text-owed' : 'text-owe'}`}>{money(m.net, { sign: true })}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center gap-3 rounded-xl bg-owe-wash px-4 py-3 text-[15px]">
          <span className="text-xl" aria-hidden="true">
            🐙
          </span>
          <span className="flex-1 font-medium">
            Marco <span className="text-ink-2">{t('balances.pays')}</span> Giulia
          </span>
          <span className="num font-bold text-owe">{money(5210)}</span>
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-owe-wash px-4 py-3 text-[15px]">
          <span className="text-xl" aria-hidden="true">
            🦦
          </span>
          <span className="flex-1 font-medium">
            Sara <span className="text-ink-2">{t('balances.pays')}</span> Giulia
          </span>
          <span className="num font-bold text-owe">{money(3210)}</span>
        </div>
      </div>
      <div className="ink-3 text-line/70">
        <GuillocheBand height={18} lines={5} />
      </div>
      <p
        className="pointer-events-none absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[24deg] font-mono text-[3.4rem] font-semibold tracking-[0.3em] whitespace-nowrap text-owe/12 select-none"
        aria-label={t('landing.specimen')}
      >
        {t('landing.specimen').toUpperCase()}
      </p>
    </div>
  );
}

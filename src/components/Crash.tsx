import { useTranslation } from 'react-i18next';
import { Portrait } from './Portrait';
import { VersionFooter } from './VersionFooter';

/** Shown instead of a blank page when a screen throws while rendering. */
export function Crash() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <Portrait animal="sloth" ink={2} size={96} />
        <p className="mt-5 text-lg font-semibold text-balance">{t('app.crash')}</p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => location.reload()} className="inline-flex h-12 items-center rounded-full bg-ink px-5 font-semibold text-paper">
            {t('app.reload')}
          </button>
          <a href="/" className="inline-flex h-12 items-center rounded-full px-5 font-semibold ring-1 ring-rule">
            {t('menu.home')}
          </a>
        </div>
      </div>
      <VersionFooter />
    </div>
  );
}

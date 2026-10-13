import { useTranslation } from 'react-i18next';
import { SOURCE_URL } from '../lib/links';
import { APP_VERSION } from '../version';

export function VersionFooter({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <footer className={`microprint flex flex-wrap items-center gap-x-2 gap-y-1 py-6 text-ink-2/70 ${className}`}>
      <span className="font-semibold text-ink-2">{t('footer.motto')}</span>
      <span aria-hidden="true">·</span>
      <a href={SOURCE_URL} target="_blank" rel="noopener" className="underline decoration-rule underline-offset-2 hover:text-ink">
        {t('footer.source')} (AGPL-3.0)
      </a>
      <span aria-hidden="true">·</span>
      <span>v {APP_VERSION}</span>
    </footer>
  );
}

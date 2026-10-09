import { useTranslation } from 'react-i18next';
import { toggleLanguage } from '../i18n';

export function LanguageToggle() {
  const { t } = useTranslation();
  return (
    <button onClick={toggleLanguage} className="microprint rounded-full px-3 py-2 ring-1 ring-rule transition-colors hover:text-ink hover:ring-ink/40" aria-label={t('app.lang')} title={t('app.lang')}>
      {t('app.langCode')}
    </button>
  );
}

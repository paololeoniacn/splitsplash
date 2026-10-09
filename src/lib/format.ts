import { useTranslation } from 'react-i18next';
import { formatMoney } from '../../shared/money';

export function useMoney(currency: string) {
  const { i18n } = useTranslation();
  const locale = i18n.language === 'it' ? 'it-IT' : 'en-GB';
  return (minor: number, opts?: { sign?: boolean }) => formatMoney(minor, currency, locale, opts);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

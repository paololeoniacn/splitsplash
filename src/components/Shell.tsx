import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LanguageToggle } from './LanguageToggle';
import { IconButton } from './ui';
import { Wordmark } from './Wordmark';

/** Narrow single-task page: create, join, invite. */
export function FormShell({ title, children, back = '/' }: { title: string; children: ReactNode; back?: string | null }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-5">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center gap-1">
          {back !== null && (
            <IconButton label={t('join.back')} onClick={() => navigate(back)} className="-ml-2">
              <ArrowLeft className="size-5" aria-hidden="true" />
            </IconButton>
          )}
          <Wordmark />
        </div>
        <LanguageToggle />
      </header>
      <main className="rise flex-1 pt-4 pb-12">
        <h1 className="mb-8 text-[2rem] leading-tight font-extrabold tracking-[-0.03em]">{title}</h1>
        {children}
      </main>
    </div>
  );
}

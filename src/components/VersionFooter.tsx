import { APP_VERSION } from '../version';

export function VersionFooter({ className = '' }: { className?: string }) {
  return <footer className={`microprint py-6 text-ink-2/70 ${className}`}>v {APP_VERSION}</footer>;
}

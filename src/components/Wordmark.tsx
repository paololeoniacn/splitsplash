import { Link } from 'react-router';

export function Wordmark({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="group inline-flex items-center gap-2 rounded-md text-[17px] font-extrabold tracking-[-0.02em]">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M12 1.5v21" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="12" cy="12" r="5" fill="var(--owe)" className="origin-center transition-transform duration-500 group-hover:scale-110" />
      </svg>
      SplitSplash
    </Link>
  );
}

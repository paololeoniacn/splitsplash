import { useEffect, useState } from 'react';

const CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Passphrase set like a banknote serial; `mint` rolls the characters into place. */
export function Serial({ value, mint = false, className = '' }: { value: string; mint?: boolean; className?: string }) {
  const [shown, setShown] = useState(mint ? scramble(value, 0) : value);

  useEffect(() => {
    if (!mint || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let frame = 0;
    const total = 26;
    const id = setInterval(() => {
      frame++;
      setShown(scramble(value, frame / total));
      if (frame >= total) clearInterval(id);
    }, 38);
    return () => clearInterval(id);
  }, [value, mint]);

  return (
    <span className={`font-mono ${className}`} aria-label={value}>
      <span aria-hidden="true">
        {shown.split('-').map((part, i, all) => (
          <span key={i} className="inline-block whitespace-nowrap">
            {part}
            {i < all.length - 1 && '-'}
          </span>
        ))}
      </span>
    </span>
  );
}

function scramble(value: string, progress: number) {
  const settled = Math.floor(value.length * progress);
  return [...value].map((c, i) => (c === '-' || i < settled ? c : CHARS[Math.floor(Math.random() * (/\d/.test(c) ? 10 : 26)) + (/\d/.test(c) ? 26 : 0)])).join('');
}

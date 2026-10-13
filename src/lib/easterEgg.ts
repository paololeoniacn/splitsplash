import { useEffect, useRef } from 'react';

const WORD = /(^|[^a-z])(coniglio|rabbit)($|[^a-z])/;

export function hasEggWord(text: string): boolean {
  return WORD.test(
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  );
}

/** Calls `onHit` once the word is finished (separator typed or a short pause); re-arms when the word disappears. */
export function useEggWord(text: string, onHit: () => void, pauseMs = 600) {
  const armed = useRef(true);
  const hit = useRef(onHit);
  hit.current = onHit;
  useEffect(() => {
    if (!hasEggWord(text)) {
      armed.current = true;
      return;
    }
    if (!armed.current) return;
    const fire = () => {
      armed.current = false;
      hit.current();
    };
    if (/[^\p{L}]$/u.test(text)) return fire();
    const id = setTimeout(fire, pauseMs);
    return () => clearTimeout(id);
  }, [text, pauseMs]);
}

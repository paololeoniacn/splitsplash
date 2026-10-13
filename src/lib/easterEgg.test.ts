import { describe, expect, it } from 'vitest';
import { hasEggWord } from './easterEgg';

describe('hasEggWord', () => {
  it.each(['coniglio', 'Cena col CONIGLIO!', 'rabbit stew', 'conìglio'])('finds %s', (s) => expect(hasEggWord(s)).toBe(true));
  it.each(['conigli', 'coniglietto', 'rabbits', 'pizza'])('ignores %s', (s) => expect(hasEggWord(s)).toBe(false));
});

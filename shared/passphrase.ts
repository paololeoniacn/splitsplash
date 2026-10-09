// Italian animal names, ASCII only so they are easy to type on any keyboard.
export const PASSPHRASE_WORDS = [
  'ape', 'aquila', 'alce', 'airone', 'allodola', 'alpaca', 'anatra', 'anguilla', 'antilope', 'armadillo',
  'asino', 'astice', 'avvoltoio', 'babbuino', 'balena', 'barracuda', 'bisonte', 'bradipo', 'bruco', 'bue',
  'bufalo', 'cammello', 'canguro', 'capibara', 'capra', 'capriolo', 'carpa', 'castoro', 'cavallo', 'cavalletta',
  'cerbiatto', 'cervo', 'cicala', 'cicogna', 'cigno', 'cincia', 'cinghiale', 'civetta', 'coccinella', 'coccodrillo',
  'colibri', 'colomba', 'condor', 'coniglio', 'corvo', 'cozza', 'criceto', 'cuculo', 'delfino', 'dingo',
  'donnola', 'dromedario', 'echidna', 'elefante', 'ermellino', 'fagiano', 'fenicottero', 'foca', 'formica', 'fringuello',
  'furetto', 'gabbiano', 'gallo', 'gallina', 'gambero', 'gatto', 'gazza', 'gazzella', 'geco', 'ghepardo',
  'ghiro', 'giaguaro', 'giraffa', 'gnu', 'gorilla', 'granchio', 'grillo', 'gru', 'gufo', 'iena',
  'iguana', 'ippocampo', 'ippopotamo', 'istrice', 'koala', 'lama', 'lemure', 'leone', 'leopardo', 'lepre',
  'libellula', 'lince', 'lombrico', 'lontra', 'lucciola', 'lucertola', 'lumaca', 'lupo', 'macaco', 'mangusta',
  'marmotta', 'martora', 'medusa', 'merlo', 'merluzzo', 'mucca', 'mulo', 'narvalo', 'nutria', 'oca',
  'orca', 'orso', 'ostrica', 'panda', 'pantera', 'pappagallo', 'passero', 'pavone', 'pellicano', 'pecora',
  'pettirosso', 'picchio', 'pinguino', 'pipistrello', 'piranha', 'pitone', 'polpo', 'pony', 'porcospino', 'procione',
  'puma', 'pulcino', 'puzzola', 'quaglia', 'ragno', 'rana', 'renna', 'riccio', 'rinoceronte', 'rondine',
  'rospo', 'salamandra', 'salmone', 'sardina', 'scimmia', 'scoiattolo', 'scorpione', 'seppia', 'serpente', 'sogliola',
  'squalo', 'stambecco', 'storione', 'struzzo', 'suricato', 'tacchino', 'talpa', 'tapiro', 'tarantola', 'tartaruga',
  'tasso', 'tigre', 'tonno', 'topo', 'tordo', 'tricheco', 'trota', 'tucano', 'upupa', 'usignolo',
  'vipera', 'volpe', 'vongola', 'yak', 'zebra', 'zanzara', 'zebu', 'fennec', 'okapi', 'pangolino',
] as const;

function randomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** Three animals + four digits ≈ 36 bits; brute force is blocked by join rate limiting. */
export function generatePassphrase(): string {
  const words = Array.from({ length: 3 }, () => PASSPHRASE_WORDS[randomInt(PASSPHRASE_WORDS.length)]);
  const digits = String(randomInt(10000)).padStart(4, '0');
  return [...words, digits].join('-');
}

/** Case/accents/separators-insensitive canonical form: "Volpe Koala.gufo 0042" → "volpe-koala-gufo-0042". */
export function normalizePassphrase(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .join('-');
}

export function isPassphraseShape(input: string): boolean {
  return /^([a-z]+-){3}\d{4}$/.test(normalizePassphrase(input));
}

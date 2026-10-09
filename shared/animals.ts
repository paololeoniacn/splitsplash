export const ANIMALS = [
  { id: 'fox', emoji: '🦊' },
  { id: 'panda', emoji: '🐼' },
  { id: 'owl', emoji: '🦉' },
  { id: 'koala', emoji: '🐨' },
  { id: 'octopus', emoji: '🐙' },
  { id: 'otter', emoji: '🦦' },
  { id: 'frog', emoji: '🐸' },
  { id: 'tiger', emoji: '🐯' },
  { id: 'lion', emoji: '🦁' },
  { id: 'bear', emoji: '🐻' },
  { id: 'rabbit', emoji: '🐰' },
  { id: 'hedgehog', emoji: '🦔' },
  { id: 'penguin', emoji: '🐧' },
  { id: 'flamingo', emoji: '🦩' },
  { id: 'turtle', emoji: '🐢' },
  { id: 'giraffe', emoji: '🦒' },
  { id: 'zebra', emoji: '🦓' },
  { id: 'whale', emoji: '🐳' },
  { id: 'parrot', emoji: '🦜' },
  { id: 'bee', emoji: '🐝' },
  { id: 'sloth', emoji: '🦥' },
  { id: 'kangaroo', emoji: '🦘' },
  { id: 'wolf', emoji: '🐺' },
  { id: 'hamster', emoji: '🐹' },
  { id: 'seal', emoji: '🦭' },
  { id: 'beaver', emoji: '🦫' },
  { id: 'elephant', emoji: '🐘' },
  { id: 'snail', emoji: '🐌' },
] as const;

export type AnimalId = (typeof ANIMALS)[number]['id'];
export const ANIMAL_IDS = ANIMALS.map((a) => a.id) as [AnimalId, ...AnimalId[]];
export const animalEmoji = (id: string) => ANIMALS.find((a) => a.id === id)?.emoji ?? '🐾';

/** Banknote denomination hues; members get one each, in join order. */
export const INK_COUNT = 6;

import { animalEmoji } from '../../shared/animals';
import { Rosette } from './Guilloche';

/** A member's banknote portrait: their animal inside a rosette printed in their denomination ink. */
export function Portrait({ animal, ink, size = 56, draw = false, className = '' }: { animal: string; ink: number; size?: number; draw?: boolean; className?: string }) {
  return (
    <span className={`ink-${ink} relative inline-grid shrink-0 place-items-center ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <Rosette size={size} seed={ink * 0.7} className="absolute inset-0 text-line" draw={draw} />
      <span className="grid place-items-center rounded-full bg-wash" style={{ width: size * 0.56, height: size * 0.56, fontSize: size * 0.32 }}>
        <span className="leading-none">{animalEmoji(animal)}</span>
      </span>
    </span>
  );
}

export function MiniPortrait({ animal, ink, size = 28 }: { animal: string; ink: number; size?: number }) {
  return (
    <span className={`ink-${ink} inline-grid shrink-0 place-items-center rounded-full bg-wash ring-1 ring-line/60`} style={{ width: size, height: size, fontSize: size * 0.55 }} aria-hidden="true">
      <span className="leading-none">{animalEmoji(animal)}</span>
    </span>
  );
}

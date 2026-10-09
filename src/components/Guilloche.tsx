import { useMemo } from 'react';

function ringPath(cx: number, cy: number, r0: number, amp: number, lobes: number, phase: number, steps = 240) {
  let d = '';
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * Math.PI * 2;
    const r = r0 + amp * Math.sin(lobes * t + phase);
    d += `${s ? 'L' : 'M'}${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
  }
  return `${d}Z`;
}

/** Security-print rosette: interleaved sine rings, the frame of every member portrait. */
export function Rosette({ size = 64, lines = 9, lobes = 12, seed = 0, draw = false, className = '' }: {
  size?: number;
  lines?: number;
  lobes?: number;
  seed?: number;
  draw?: boolean;
  className?: string;
}) {
  const paths = useMemo(() => {
    const c = 50;
    const out: string[] = [];
    for (let i = 0; i < lines; i++) out.push(ringPath(c, c, 41, 6.5, lobes, (i / lines) * Math.PI * 2 + seed));
    for (let i = 0; i < Math.ceil(lines / 2); i++) out.push(ringPath(c, c, 29, 3, lobes * 2, (i / lines) * Math.PI * 4 + seed));
    return out;
  }, [lines, lobes, seed]);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true" fill="none" stroke="currentColor">
      {paths.map((d, i) => (
        <path
          key={`${seed}-${i}`}
          d={d}
          strokeWidth={i < lines ? 0.55 : 0.4}
          pathLength={1}
          style={draw ? ({ strokeDasharray: 1, '--len': 1, animation: `rosette-draw 900ms ${i * 35}ms var(--ease-out-expo) both` } as React.CSSProperties) : undefined}
        />
      ))}
    </svg>
  );
}

/** Horizontal guilloche band, the banknote's border strip. */
export function GuillocheBand({ lines = 7, height = 28, className = '' }: { lines?: number; height?: number; className?: string }) {
  const paths = useMemo(() => {
    const w = 600;
    const h = 40;
    const out: string[] = [];
    for (let i = 0; i < lines; i++) {
      let d = '';
      for (let x = 0; x <= w; x += 3) {
        const y = h / 2 + 13 * Math.sin((x / w) * Math.PI * 14 + (i / lines) * Math.PI * 2) * (0.75 + 0.25 * Math.sin((x / w) * Math.PI * 3));
        d += `${x ? 'L' : 'M'}${x} ${y.toFixed(2)}`;
      }
      out.push(d);
    }
    return out;
  }, [lines]);
  return (
    <svg viewBox="0 0 600 40" preserveAspectRatio="none" height={height} className={`w-full ${className}`} aria-hidden="true" fill="none" stroke="currentColor">
      {paths.map((d, i) => (
        <path key={i} d={d} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

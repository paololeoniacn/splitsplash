import { useTranslation } from 'react-i18next';
import { ANIMALS } from '../../shared/animals';

export function AnimalPicker({ value, onChange, taken = [], ink = 0, label }: { value: string; onChange: (id: string) => void; taken?: string[]; ink?: number; label: string }) {
  const { t } = useTranslation();
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-semibold">{label}</legend>
      <div className={`ink-${ink} grid grid-cols-7 gap-1.5`}>
        {ANIMALS.map((a) => {
          const selected = a.id === value;
          const isTaken = taken.includes(a.id) && !selected;
          return (
            <label
              key={a.id}
              title={t(`animals.${a.id}`)}
              className={`relative grid aspect-square cursor-pointer place-items-center rounded-xl text-[22px] transition-all duration-200 has-focus-visible:outline-2 has-focus-visible:outline-ink ${
                selected ? 'scale-105 bg-wash ring-2 ring-line' : 'hover:bg-ink/5'
              } ${isTaken ? 'opacity-35' : ''}`}
            >
              <input type="radio" name="animal" value={a.id} checked={selected} onChange={() => onChange(a.id)} className="sr-only" aria-label={t(`animals.${a.id}`)} />
              <span aria-hidden="true">{a.emoji}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

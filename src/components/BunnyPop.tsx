import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Easter egg: a giant bunny in its own top-layer dialog, above the expense sheet. Tap or Esc pops it. */
export function BunnyPop({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [popping, setPopping] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) (setPopping(false), d.showModal());
    if (!open && d.open) d.close();
  }, [open]);

  const pop = () => {
    if (popping) return;
    setPopping(true);
    setTimeout(onClose, 260);
  };

  return (
    <dialog
      ref={ref}
      className="bunny"
      onCancel={(e) => {
        e.preventDefault();
        e.stopPropagation(); // React bubbles this to the expense sheet's dialog
        pop();
      }}
    >
      {open && (
        <button type="button" className="grid size-full place-items-center outline-none" onClick={pop} aria-label={t('egg.close')} autoFocus>
          <span aria-hidden="true" className={`bunny-emoji select-none ${popping ? 'bunny-out' : 'bunny-in'}`}>
            🐰
          </span>
        </button>
      )}
    </dialog>
  );
}

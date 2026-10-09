import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ToastMsg {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

const Ctx = createContext<(t: Omit<ToastMsg, 'id'>) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((t: Omit<ToastMsg, 'id'>) => {
    clearTimeout(timer.current);
    setToast({ ...t, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), t.action ? 6000 : 3200);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className="rise pointer-events-auto flex items-center gap-4 rounded-full bg-ink py-2.5 pr-2.5 pl-5 text-sm font-medium text-paper shadow-[0_10px_30px_-10px_rgb(0_0_0/0.5)]">
            <span>{toast.text}</span>
            {toast.action && (
              <button
                className="rounded-full bg-paper/15 px-3 py-1.5 font-semibold hover:bg-paper/25"
                onClick={() => {
                  toast.action!.run();
                  setToast(null);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

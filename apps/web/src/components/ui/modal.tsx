'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '@/lib/format';

/**
 * A dialog built on the native `<dialog>` element.
 *
 * `showModal()` gives focus trapping, Escape-to-close, inert background and
 * the top-layer backdrop for free. The original hand-rolled all of that, then
 * shipped a polyfill and a `document.write` to load it — none of which is
 * needed now that `<dialog>` is supported everywhere.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md';
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // A click landing on the dialog element itself is a backdrop click; a
      // click inside the content stops at the inner wrapper.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className={cx(
        'surface shadow-table m-auto w-[calc(100vw-2rem)] p-0 text-ink-50 backdrop:bg-black/70 backdrop:backdrop-blur-sm',
        'open:animate-rise',
        size === 'sm' ? 'max-w-sm' : 'max-w-lg',
      )}
    >
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md px-2 py-1 text-ink-400 transition-colors hover:bg-felt-700 hover:text-ink-50"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3 text-ink-200">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}

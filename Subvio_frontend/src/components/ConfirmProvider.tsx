import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(async () => false);

/** Provides an awaitable confirmation dialog: `if (await confirm({...})) doIt()`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(value: boolean) => void>(undefined);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => (resolver.current = resolve));
  }, []);

  const close = (result: boolean) => {
    resolver.current?.(result);
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={Boolean(options)}
        onOpenChange={(open) => !open && close(false)}
        title={options?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button variant={options?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {options?.confirmLabel ?? 'Confirm'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">{options?.description}</p>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

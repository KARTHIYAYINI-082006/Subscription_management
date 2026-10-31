import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CornerDownLeft, Plus, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NAV_GROUPS } from '@/lib/constants';
import { cn } from '@/lib/utils';

/** Keyboard-driven jump menu (Ctrl/⌘ + K) over the pages the current role can open. */
export function QuickJump({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user, isStaff } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const items = useMemo(() => {
    if (!user) return [];
    const pages = NAV_GROUPS.flatMap((g) => g.items.filter((i) => i.roles.includes(user.role)).map((i) => ({ ...i, group: g.title })));
    const actions = isStaff ? [{ to: '/subscriptions/new', label: 'New subscription', icon: Plus, group: 'Actions' }] : [];
    const q = query.trim().toLowerCase();
    return [...actions, ...pages].filter((i) => !q || i.label.toLowerCase().includes(q) || i.group.toLowerCase().includes(q));
  }, [user, isStaff, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    setQuery('');
    setActive(0);
  }, [open]);

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-white shadow-pop focus:outline-none">
          <DialogPrimitive.Title className="sr-only">Quick jump</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Search pages and actions</DialogPrimitive.Description>
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="size-4 text-ink-muted" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, items.length - 1));
                if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
                if (e.key === 'Enter' && items[active]) go(items[active].to);
              }}
              placeholder="Jump to a page or action…"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-muted/70"
            />
            <kbd className="rounded-md border border-line px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">ESC</kbd>
          </div>
          <ul className="scrollbar-thin max-h-80 overflow-y-auto p-2">
            {items.length === 0 && <li className="px-3 py-8 text-center text-xs text-ink-muted">No matches</li>}
            {items.map((item, i) => (
              <li key={item.to}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item.to)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm', i === active ? 'bg-brand-50/70 text-ink' : 'text-ink')}
                >
                  <item.icon className="size-4 text-brand-600" />
                  <span className="flex-1 font-medium">{item.label}</span>
                  <span className="text-[11px] text-ink-muted">{item.group}</span>
                  {i === active && <CornerDownLeft className="size-3.5 text-ink-muted" />}
                </button>
              </li>
            ))}
          </ul>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

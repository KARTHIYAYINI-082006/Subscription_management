import type { ReactNode } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';

export interface MenuAction {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

export function Dropdown({ trigger, items, header, align = 'end' }: { trigger: ReactNode; items: MenuAction[]; header?: ReactNode; align?: 'start' | 'end' }) {
  const visible = items.filter((i) => !i.hidden);
  if (!visible.length) return null;
  return (
    <Menu.Root modal={false}>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align={align} sideOffset={8} className="z-50 min-w-48 rounded-2xl border border-line bg-white/95 p-1.5 shadow-pop backdrop-blur">
          {header && <div className="mb-1 border-b border-line px-2.5 pb-2.5 pt-1.5">{header}</div>}
          {visible.map((item) => (
            <Menu.Item
              key={item.label}
              onSelect={item.onSelect}
              className={cn(
                'flex cursor-pointer select-none items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium outline-none data-[highlighted]:bg-brand-50/70 [&_svg]:size-4',
                item.danger ? 'text-rose-600' : 'text-ink',
              )}
            >
              {item.icon}
              {item.label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

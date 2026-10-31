import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LayoutGrid, LogOut, Search, UserRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MOBILE_TABS, NAV_GROUPS, navFor, type NavItem } from '@/lib/constants';
import { cn, initials, titleCase } from '@/lib/utils';
import { Logo, PageLoader } from '@/components/common';
import { Dropdown } from '@/components/ui/dropdown';
import { Dialog } from '@/components/ui/dialog';
import { QuickJump } from '@/components/layout/QuickJump';

const SHELL_LABEL = { ADMIN: 'Admin console', STAFF: 'Staff workspace', CUSTOMER: 'Customer portal' } as const;
const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const isActivePath = (to: string, path: string) => (to === '/' ? path === '/' : path.startsWith(to));
/** Customer-facing labels for the portal. */
const portalLabel = (item: NavItem) => (item.to === '/' ? 'Overview' : item.label);

function useShellState() {
  const location = useLocation();
  const [jumpOpen, setJumpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const current = NAV_ITEMS.find((i) => isActivePath(i.to, location.pathname));
  return { path: location.pathname, current, jumpOpen, setJumpOpen, menuOpen, setMenuOpen };
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-xs font-bold text-white ring-2 ring-white', className)}>
      {initials(name)}
    </span>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <Dropdown
      header={
        <>
          <p className="truncate text-sm font-bold text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-muted">{user.email}</p>
        </>
      }
      trigger={
        <button className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-white sm:pr-3" aria-label="Account menu">
          <Avatar name={user.name} />
          <span className="hidden text-left sm:block">
            <span className="block max-w-36 truncate text-[13px] font-bold leading-tight text-ink">{user.name}</span>
            <span className="block text-[11px] leading-tight text-ink-muted">{titleCase(user.role)}</span>
          </span>
        </button>
      }
      items={[
        { label: 'My profile', icon: <UserRound />, onSelect: () => navigate('/settings') },
        { label: 'Log out', icon: <LogOut />, onSelect: logout, danger: true },
      ]}
    />
  );
}

function SearchButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button onClick={onClick} className={cn('flex h-10 items-center gap-2.5 rounded-full border border-line bg-white/80 px-3.5 text-xs text-ink-muted shadow-sm transition-colors hover:border-brand-300/60', className)}>
      <Search className="size-4" />
      <span className="hidden md:inline">Search or jump to…</span>
      <kbd className="ml-4 hidden rounded-md bg-cloud px-1.5 py-0.5 text-[10px] font-semibold md:inline">Ctrl K</kbd>
    </button>
  );
}

/** Bottom navigation for phones; the last slot opens the full menu when `onMore` is given. */
function MobileTabBar({ tabs, path, onMore, label }: { tabs: NavItem[]; path: string; onMore?: () => void; label: (i: NavItem) => string }) {
  const tab = 'flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-semibold transition-colors';
  return (
    <nav className="glass fixed inset-x-3 bottom-3 z-40 flex rounded-2xl px-1 shadow-pop lg:hidden print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {tabs.map((item) => {
        const active = isActivePath(item.to, path);
        return (
          <Link key={item.to} to={item.to} className={cn(tab, active ? 'text-brand-700' : 'text-ink-muted')}>
            <span className={cn('flex h-7 w-12 items-center justify-center rounded-full transition-colors', active && 'bg-gradient-to-r from-brand-100 to-fuchsia-100')}>
              <item.icon className="size-[18px]" />
            </span>
            {label(item)}
          </Link>
        );
      })}
      {onMore && (
        <button onClick={onMore} className={cn(tab, 'text-ink-muted')}>
          <span className="flex h-7 w-12 items-center justify-center">
            <LayoutGrid className="size-[18px]" />
          </span>
          Menu
        </button>
      )}
    </nav>
  );
}

const tabsFor = (routes: string[]) => routes.map((to) => NAV_ITEMS.find((i) => i.to === to)!).filter(Boolean);

/* --------------------------- Admin & staff console --------------------------- */
function ConsoleShell() {
  const { user } = useAuth();
  const { path, current, jumpOpen, setJumpOpen, menuOpen, setMenuOpen } = useShellState();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('subvio_sidebar') === 'collapsed');
  useEffect(() => localStorage.setItem('subvio_sidebar', collapsed ? 'collapsed' : 'expanded'), [collapsed]);
  if (!user) return null;
  const groups = navFor(user.role);

  return (
    <div className="canvas flex h-full">
      <aside className={cn('glass relative m-3 hidden shrink-0 flex-col rounded-3xl shadow-card transition-[width] duration-200 lg:flex print:hidden', collapsed ? 'w-[76px]' : 'w-64')}>
        <div className={cn('relative flex h-16 items-center', collapsed ? 'justify-center' : 'px-5')}>
          <Link to="/home" aria-label="Subvio home">
            <Logo compact={collapsed} />
          </Link>
        </div>
        {!collapsed && (
          <div className="relative mx-4 mb-2 rounded-2xl bg-gradient-to-r from-brand-50 to-fuchsia-50 px-3 py-2.5 ring-1 ring-brand-100">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-brand-600">{SHELL_LABEL[user.role]}</p>
            <p className="truncate text-xs text-ink-muted">Brightloop Software</p>
          </div>
        )}
        <nav className="scrollbar-thin relative flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {groups.map((group) => (
            <div key={group.title}>
              {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted/70">{group.title}</p>}
              <ul className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all',
                          collapsed && 'justify-center px-0',
                          isActive ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow' : 'text-ink-muted hover:bg-brand-50 hover:text-brand-700',
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon className={cn('size-[18px] shrink-0', !isActive && 'text-ink-muted/80 group-hover:text-brand-600')} />
                          {!collapsed && <span className="truncate">{label}</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="relative m-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-white text-xs font-semibold text-ink-muted transition-colors hover:text-brand-700"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight className="size-4" /> : (<><ChevronsLeft className="size-4" /> Collapse</>)}
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 px-4 backdrop-blur-md sm:px-6 lg:pl-3 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/home" className="lg:hidden" aria-label="Subvio home">
              <Logo compact />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">{SHELL_LABEL[user.role]}</p>
              <p className="truncate text-sm font-bold text-ink">{current?.label ?? 'Dashboard'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SearchButton onClick={() => setJumpOpen(true)} />
            <UserMenu />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-2 sm:px-6 lg:pb-10 lg:pl-3 print:p-0">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      <MobileTabBar tabs={tabsFor(MOBILE_TABS.console)} path={path} label={(i) => (i.to === '/' ? 'Home' : i.label)} onMore={() => setMenuOpen(true)} />
      <Dialog open={menuOpen} onOpenChange={setMenuOpen} title="Menu" description={SHELL_LABEL[user.role]}>
        <div className="space-y-5 pb-2">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">{group.title}</p>
              <div className="grid grid-cols-3 gap-2">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className={cn('flex flex-col items-center gap-2 rounded-2xl border p-3 text-center text-[11px] font-semibold transition-colors', isActivePath(to, path) ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-line text-ink hover:bg-cloud')}>
                    <Icon className="size-5 text-brand-600" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Dialog>
      <QuickJump open={jumpOpen} onOpenChange={setJumpOpen} />
    </div>
  );
}

/* ------------------------------ Customer portal ------------------------------ */
function PortalShell() {
  const { user } = useAuth();
  const { path, jumpOpen, setJumpOpen } = useShellState();
  if (!user) return null;
  const items = navFor('CUSTOMER').flatMap((g) => g.items);

  return (
    <div className="canvas min-h-full">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-white/70 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/home" className="flex items-center gap-3" aria-label="Subvio home">
            <Logo />
            <span className="hidden rounded-full bg-gradient-to-r from-brand-50 to-fuchsia-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-600 ring-1 ring-brand-100 sm:inline">Portal</span>
          </Link>
          <nav className="hidden items-center gap-1 rounded-full border border-line bg-white/80 p-1 shadow-sm lg:flex">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn('flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors', isActive ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-glow' : 'text-ink-muted hover:text-brand-700')}
              >
                <item.icon className="size-4" />
                {portalLabel(item)}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <SearchButton onClick={() => setJumpOpen(true)} className="md:hidden" />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-8 sm:px-6 lg:pb-12 print:p-0">
        <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
      </main>
      <MobileTabBar tabs={tabsFor(MOBILE_TABS.portal)} path={path} label={portalLabel} />
      <QuickJump open={jumpOpen} onOpenChange={setJumpOpen} />
    </div>
  );
}

/** Admins and staff get the console; customers get the portal. */
export function AppShell() {
  const { user } = useAuth();
  return user?.role === 'CUSTOMER' ? <PortalShell /> : <ConsoleShell />;
}

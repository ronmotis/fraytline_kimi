import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Radar,
  FileText,
  Truck,
  Bot,
  Users,
  Wallet,
  Settings,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Command,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState, type Role } from '@/lib/store';
import CommandBar from './CommandBar';
import RoleSwitcher from './RoleSwitcher';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/lib/theme';

const NAV = [
  { to: '/today', label: 'Today', icon: LayoutDashboard },
  { to: '/movements', label: 'Movements', icon: ArrowRightLeft },
  { to: '/opportunities', label: 'Radar', icon: Radar },
  { to: '/quotes', label: 'Quotes', icon: FileText },
  { to: '/fleet', label: 'Fleet & Ops', icon: Truck },
  { to: '/conductor', label: 'Conductor', icon: Bot },
  { to: '/network', label: 'Network', icon: Users },
  { to: '/ledger', label: 'Ledger', icon: Wallet },
];

const ROLE_PATHS: Record<Role, string[]> = {
  Owner: NAV.map((n) => n.to),
  Ops: ['/today', '/movements', '/opportunities', '/quotes', '/fleet', '/conductor'],
  Finance: ['/today', '/quotes', '/ledger'],
};

export default function Layout() {
  const theme = useTheme(); // re-render shell on theme flip (inline tint styles)
  const [collapsed, setCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { role, alerts, autonomyMode } = useAppState();
  const location = useLocation();
  const navigate = useNavigate();
  const allowed = ROLE_PATHS[role];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  return (
    <div className="grain relative flex h-screen overflow-hidden bg-canvas">
      {/* ============ LEFT NAV ============ */}
      <motion.nav
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-30 flex flex-none flex-col border-r border-line-hairline bg-surface-1"
      >
        {/* logo */}
        <div className="flex h-16 items-center justify-between border-b border-line-hairline px-4">
          <button onClick={() => navigate('/today')} className="flex items-center gap-2.5 overflow-hidden">
            <img src="/logo.svg" alt="fraytline" className={cn('h-5 transition-opacity', collapsed && 'opacity-0')} />
            {collapsed && (
              <svg width="22" height="22" viewBox="0 0 26 26" fill="none">
                <path d="M2 16 H10 L18 8" stroke="var(--ember)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="10" cy="16" r="2.2" fill="var(--ember)" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-chip p-1.5 text-text-3 transition-colors hover:bg-surface-2 hover:text-text-1"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* nav items */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {NAV.filter((n) => allowed.includes(n.to)).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cn(
                  'group relative mb-0.5 flex items-center gap-3 rounded-card px-3 py-2 text-small transition-colors',
                  isActive ? 'text-text-1' : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-card bg-surface-2"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  {isActive && <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-ember" />}
                  <n.icon className="relative z-10 h-4 w-4 flex-none" />
                  {!collapsed && <span className="relative z-10 whitespace-nowrap">{n.label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* settings + collapse */}
        <div className="border-t border-line-hairline px-2 py-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-card px-3 py-2 text-small transition-colors',
                isActive ? 'bg-surface-2 text-text-1' : 'text-text-2 hover:bg-surface-2 hover:text-text-1',
              )
            }
          >
            <Settings className="h-4 w-4 flex-none" />
            {!collapsed && 'Settings'}
          </NavLink>
        </div>
      </motion.nav>

      {/* ============ MAIN ============ */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="relative z-20 flex h-16 flex-none items-center justify-between border-b border-line-hairline bg-surface-1 px-5">
          <div className="flex items-center gap-3">
            {/* exchange context switcher */}
            <div className="flex items-center gap-1 rounded-card border border-line-hairline bg-surface-2 p-1">
              {['Accra', 'Nairobi'].map((ex, i) => (
                <button
                  key={ex}
                  className={cn(
                    'rounded-chip px-3 py-1 text-caption transition-colors',
                    i === 0 ? 'bg-surface-3 text-text-1' : 'text-text-2 hover:text-text-1',
                  )}
                >
                  {ex}
                </button>
              ))}
            </div>
            <span className="hidden font-mono text-caption text-text-3 md:inline">
              Exchange 5 · Week 4 · {autonomyMode}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* search */}
            <button
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 rounded-card border border-line-hairline bg-surface-2 px-3 py-1.5 text-caption text-text-3 transition-colors hover:border-line-strong hover:text-text-2"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search or command…</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-line-hairline bg-surface-1 px-1.5 font-mono text-[10px] lg:flex">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </button>

            {/* alerts */}
            <button className="relative rounded-chip p-2 text-text-2 transition-colors hover:text-text-1">
              <Bell className="h-4 w-4" />
              {alerts.filter((a) => !a.read).length > 0 && (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-ember shadow-glow-ember" />
              )}
            </button>

            <RoleSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* content */}
        <main className="relative min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandBar open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

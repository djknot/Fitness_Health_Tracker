import { NavLink, Outlet } from 'react-router-dom';
import { Apple, Dumbbell, HeartPulse, LayoutDashboard, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/workouts', label: 'Workouts', icon: Dumbbell },
  { to: '/nutrition', label: 'Nutrition', icon: Apple },
  { to: '/metrics', label: 'Metrics', icon: HeartPulse },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-edge bg-surface px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg" />
          <div>
            <div className="text-sm font-bold leading-tight text-ink">FitTrack</div>
            <div className="text-[11px] leading-tight text-muted">Fitness &amp; health</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-accent-wash text-accent' : 'text-ink2 hover:bg-accent-wash/60 hover:text-ink'
                }`
              }
            >
              <Icon size={18} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-[11px] leading-relaxed text-muted">
          Your data never leaves this device.
        </p>
      </aside>

      {/* Content */}
      <main className="pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto w-full max-w-5xl px-4 pt-5 sm:px-6 md:pt-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-edge bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Main"
      >
        <div className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                  isActive ? 'text-accent' : 'text-muted'
                }`
              }
            >
              <Icon size={20} aria-hidden />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

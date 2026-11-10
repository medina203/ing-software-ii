import { useEffect, useState } from 'react';
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  Tags,
  Users,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../lib/cn';
import { initials, roleLabels } from '../lib/format';

const navigation = [
  {
    to: '/',
    label: 'Panel',
    icon: LayoutDashboard,
    end: true,
    adminOnly: true,
  },
  { to: '/inventario', label: 'Inventario', icon: Boxes },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/alquileres', label: 'Alquileres', icon: ClipboardList },
  { to: '/devoluciones', label: 'Devoluciones', icon: RotateCcw },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, adminOnly: true },
  { to: '/categorias', label: 'Categorías', icon: Tags, adminOnly: true },
  { to: '/usuarios', label: 'Usuarios', icon: Package, adminOnly: true },
];

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visibleNavigation = navigation.filter(
    (item) => !item.adminOnly || usuario?.rol === 'ADMIN',
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink-900/60 backdrop-blur-sm lg:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-ink-900 text-slate-300 transition-transform duration-200 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-20 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-ink-900 shadow-lg shadow-brand-500/10">
              <span className="text-lg font-black tracking-tighter">OG</span>
            </div>
            <div>
              <p className="text-lg font-bold leading-tight tracking-tight text-white">
                ObraGest
              </p>
              <p className="text-[11px] font-medium text-slate-500">
                Inventario & alquiler
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mx-5 h-px bg-white/5" />

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
            Operación
          </p>
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                    isActive
                      ? 'bg-white/10 text-white shadow-sm'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] transition',
                        isActive
                          ? 'text-brand-400'
                          : 'text-slate-500 group-hover:text-slate-300',
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-white/5 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-ink-900">
              {usuario ? initials(usuario.nombre) : 'US'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">
                {usuario?.nombre}
              </p>
              <p className="text-[11px] text-slate-500">
                {usuario ? roleLabels[usuario.rol] : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-600">
            ObraGest · v1.0 · {new Date().getFullYear()}
          </p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-xs font-black text-ink-900">
              OG
            </div>
            <span className="font-bold tracking-tight text-slate-900">
              ObraGest
            </span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
            {usuario ? initials(usuario.nombre) : 'US'}
          </div>
        </header>

        <main className="mx-auto min-h-screen max-w-[1500px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

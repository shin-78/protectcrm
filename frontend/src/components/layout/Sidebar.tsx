'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useUIStore, useWAStore } from '@/store';
import { cn, ROLE_LABELS } from '@/lib/utils';
import {
  LayoutDashboard, Users, MessageSquare, GitBranch,
  CheckSquare, Bell, Settings, LogOut, Shield,
  ChevronLeft, ChevronRight, Wifi, WifiOff, Phone
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['MASTER','SUPERVISOR','OPERATOR'] },
  { href: '/leads', icon: Users, label: 'Leads', roles: ['MASTER','SUPERVISOR','OPERATOR'] },
  { href: '/pipeline', icon: GitBranch, label: 'Pipeline', roles: ['MASTER','SUPERVISOR','OPERATOR'] },
  { href: '/whatsapp', icon: MessageSquare, label: 'WhatsApp', roles: ['MASTER','SUPERVISOR','OPERATOR'] },
  { href: '/tasks', icon: CheckSquare, label: 'Tarefas', roles: ['MASTER','SUPERVISOR','OPERATOR'] },
  { href: '/users', icon: Users, label: 'Usuários', roles: ['MASTER','SUPERVISOR'] },
  { href: '/reports', icon: LayoutDashboard, label: 'Relatórios', roles: ['MASTER','SUPERVISOR'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { session } = useWAStore();

  const handleLogout = () => { logout(); router.push('/login'); };

  const filteredNav = navItems.filter(item =>
    user?.role && item.roles.includes(user.role)
  );

  return (
    <aside className={cn(
      'relative flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
      sidebarOpen ? 'w-64' : 'w-16'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-3 p-4 border-b border-sidebar-border', !sidebarOpen && 'justify-center')}>
        <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {sidebarOpen && (
          <div>
            <div className="text-sidebar-foreground font-bold text-sm leading-none">ProtectCRM</div>
            <div className="text-sidebar-foreground/40 text-xs mt-0.5">v1.0.0</div>
          </div>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-sidebar border border-sidebar-border rounded-full flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors z-10 shadow-sm"
      >
        {sidebarOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
      </button>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {sidebarOpen && (
          <div className="px-3 py-2 text-sidebar-foreground/30 text-[10px] uppercase tracking-widest font-semibold">
            Menu Principal
          </div>
        )}
        {filteredNav.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={!sidebarOpen ? label : undefined}
              className={cn(
                'sidebar-item',
                isActive && 'active',
                !sidebarOpen && 'justify-center px-2'
              )}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-white' : 'text-sidebar-foreground/60')} />
              {sidebarOpen && <span className="text-sm">{label}</span>}
              {isActive && sidebarOpen && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* WhatsApp Status */}
      <div className={cn('px-3 py-2 border-t border-sidebar-border', !sidebarOpen && 'flex justify-center')}>
        <Link href="/whatsapp" className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors',
          !sidebarOpen && 'justify-center px-2'
        )}>
          <div className="relative flex-shrink-0">
            <Phone className="w-5 h-5 text-sidebar-foreground/50" />
            <div className={cn(
              'absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-sidebar',
              session.status === 'CONNECTED' ? 'bg-green-400' :
              session.status === 'QR_CODE' ? 'bg-yellow-400' : 'bg-red-400'
            )} />
          </div>
          {sidebarOpen && (
            <div>
              <div className="text-xs font-medium text-sidebar-foreground/70">
                {session.status === 'CONNECTED' ? session.profileName || 'WhatsApp' : 'WhatsApp'}
              </div>
              <div className={cn('text-[10px]',
                session.status === 'CONNECTED' ? 'text-green-400' :
                session.status === 'QR_CODE' ? 'text-yellow-400' : 'text-red-400/70'
              )}>
                {session.status === 'CONNECTED' ? '● Conectado' :
                 session.status === 'QR_CODE' ? '◌ Aguardando QR' : '○ Desconectado'}
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* User info */}
      <div className={cn('p-3 border-t border-sidebar-border', !sidebarOpen && 'flex justify-center')}>
        <div className={cn('flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors', !sidebarOpen && 'justify-center')}>
          <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <div className="text-sidebar-foreground text-xs font-medium truncate">{user?.name}</div>
              <div className="text-sidebar-foreground/40 text-[10px]">{user?.role && ROLE_LABELS[user.role]}</div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="text-sidebar-foreground/40 hover:text-red-400 transition-colors p-1"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

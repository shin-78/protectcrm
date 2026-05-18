'use client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore, useNotificationStore, useUIStore } from '@/store';
import { dashboardApi } from '@/services/api';
import { formatRelative } from '@/lib/utils';
import { Bell, Search, Sun, Moon, X, Check } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/pipeline': 'Pipeline Comercial',
  '/whatsapp': 'WhatsApp',
  '/tasks': 'Tarefas',
  '/users': 'Usuários',
  '/reports': 'Relatórios',
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { notifications, unreadCount, setNotifications, markAllRead } = useNotificationStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const title = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'ProtectCRM';

  useEffect(() => {
    dashboardApi.getNotifications().then(({ data }) => {
      setNotifications(data.notifications, data.unread);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleMarkRead = async () => {
    await dashboardApi.markNotificationsRead().catch(() => {});
    markAllRead();
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="font-bold text-foreground text-lg leading-none">{title}</h1>
        <p className="text-muted-foreground text-xs mt-0.5">{greeting}, {user?.name?.split(' ')[0]} 👋</p>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          title="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            id="notifications-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-9 h-9 rounded-xl border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 gradient-primary rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 animate-in overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-sm">Notificações</span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={handleMarkRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                      <Check className="w-3 h-3" /> Marcar todas
                    </button>
                  )}
                  <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div key={n.id} className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-start gap-3">
                        {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
                        <div className={!n.isRead ? '' : 'ml-5'}>
                          <div className="text-sm font-medium text-foreground">{n.title}</div>
                          <div className="text-xs text-muted-foreground">{n.content}</div>
                          <div className="text-[10px] text-muted-foreground/60 mt-1">{formatRelative(n.createdAt)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm">
          {user?.name?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()}
        </div>
      </div>
    </header>
  );
}

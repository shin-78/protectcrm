import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'MASTER' | 'SUPERVISOR' | 'OPERATOR';
  avatar?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('crm_token', token);
          localStorage.setItem('crm_user', JSON.stringify(user));
        }
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),
    }),
    {
      name: 'crm-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Notification store
interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { name: string; avatar?: string };
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[], count: number) => void;
  addNotification: (n: Notification) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  addNotification: (n) => set((s) => ({
    notifications: [n, ...s.notifications].slice(0, 50),
    unreadCount: s.unreadCount + 1,
  })),
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),
}));

// WhatsApp session store
interface WASession {
  status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'QR_CODE';
  qrCode?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePicture?: string;
  instanceName?: string;
}

interface WAState {
  session: WASession;
  setSession: (s: Partial<WASession>) => void;
}

export const useWAStore = create<WAState>((set) => ({
  session: { status: 'DISCONNECTED' },
  setSession: (data) => set((s) => ({ session: { ...s.session, ...data } })),
}));

// UI store
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleTheme: () => set((s) => {
        const next = s.theme === 'light' ? 'dark' : 'light';
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', next === 'dark');
        }
        return { theme: next };
      }),
    }),
    { name: 'crm-ui' }
  )
);

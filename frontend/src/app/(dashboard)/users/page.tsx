'use client';
import { useState, useEffect } from 'react';
import { usersApi } from '@/services/api';
import { useAuthStore } from '@/store';
import { Users, Loader2, Plus, Shield, ShieldAlert, User, Search, Trash2, Edit2 } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS, formatDate } from '@/lib/utils';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersApi.getAll()
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (currentUser?.role === 'OPERATOR') {
    return <div className="p-8 text-center text-red-500 font-medium">Acesso negado.</div>;
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      await usersApi.delete(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      alert('Erro ao remover usuário');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> 
            Gestão da Equipe
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie os usuários e permissões do sistema.</p>
        </div>
        {currentUser?.role === 'MASTER' && (
          <button className="flex items-center gap-2 px-4 py-2 gradient-primary text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Pesquisar usuários..." 
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Função</th>
                <th className="px-6 py-4">Status WhatsApp</th>
                <th className="px-6 py-4">Leads</th>
                <th className="px-6 py-4">Último Acesso</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white font-bold text-xs">
                        {u.name.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[u.role]}`}>
                        {u.role === 'MASTER' ? <ShieldAlert className="w-3.5 h-3.5" /> : 
                         u.role === 'SUPERVISOR' ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.whatsappSession?.status === 'CONNECTED' ? (
                        <span className="text-emerald-500 font-medium text-xs flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Conectado
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Desconectado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{u._count?.leads || 0}</td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {u.lastSeen ? formatDate(u.lastSeen) : 'Nunca'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {currentUser?.role === 'MASTER' && currentUser.id !== u.id && (
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

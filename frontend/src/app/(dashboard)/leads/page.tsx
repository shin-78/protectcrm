'use client';
import { useState, useEffect } from 'react';
import { leadsApi } from '@/services/api';
import { STATUS_LABELS, STATUS_COLORS, formatCurrency, formatDate } from '@/lib/utils';
import { Users, Search, Plus, Loader2, Download, Filter, MoreHorizontal } from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data } = await leadsApi.getAll({ limit: 50 });
      setLeads(data.leads);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> 
            Meus Leads
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie seus contatos e clientes potenciais. ({total} total)</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 border border-border bg-card text-sm font-medium rounded-xl hover:bg-muted transition-colors shadow-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 gradient-primary text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 justify-between bg-muted/10">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Pesquisar por nome, email, empresa ou telefone..." 
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-border bg-background text-sm font-medium rounded-xl hover:bg-muted transition-colors">
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Nome do Lead</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Criado em</th>
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
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.company || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{lead.phone}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[lead.status]}`}>
                        {STATUS_LABELS[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {lead.value ? formatCurrency(lead.value) : '-'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground bg-muted/10">
          <span>Mostrando {leads.length} de {total} registros</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-border rounded-lg disabled:opacity-50">Anterior</button>
            <button className="px-3 py-1 border border-border rounded-lg">Próxima</button>
          </div>
        </div>
      </div>
    </div>
  );
}

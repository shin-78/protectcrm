'use client';
import { useState, useEffect } from 'react';
import { dashboardApi } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { Users, DollarSign, MessageSquare, Phone, TrendingUp, TrendingDown, Activity, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(({ data }) => setStats(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const metrics = [
    { label: 'Total de Leads', value: stats?.totalLeads || 0, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Receita Total', value: formatCurrency(stats?.totalRevenue || 0), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Conversão', value: `${stats?.conversionRate || 0}%`, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Operadores Online', value: `${stats?.onlineOperators || 0}/${stats?.operators || 0}`, icon: Phone, color: 'text-green-500', bg: 'bg-green-500/10' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">Visão Geral</h1>
        <p className="text-muted-foreground text-sm">Acompanhe as principais métricas do seu CRM.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">{m.label}</p>
                <h3 className="text-2xl font-bold mt-2">{m.value}</h3>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.bg}`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 metric-card flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold">Evolução de Leads</h3>
              <p className="text-muted-foreground text-sm">Quantidade de leads gerados por mês</p>
            </div>
            {stats?.growth !== undefined && (
              <div className={`flex items-center gap-1 text-sm font-medium ${stats.growth >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {stats.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(stats.growth)}% em relação ao mês anterior
              </div>
            )}
          </div>
          <div className="h-[300px] w-full">
            {stats?.monthlyChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados</div>
            )}
          </div>
        </div>

        {/* WhatsApp Stats */}
        <div className="metric-card flex flex-col">
          <div className="mb-6">
            <h3 className="font-bold">Tráfego WhatsApp</h3>
            <p className="text-muted-foreground text-sm">Mensagens este mês</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center gap-6">
            <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enviadas</p>
                <h4 className="text-2xl font-bold">{stats?.messagesSent || 0}</h4>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-secondary/80 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Recebidas</p>
                <h4 className="text-2xl font-bold">{stats?.messagesReceived || 0}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="metric-card">
        <h3 className="font-bold mb-6">Atividades Recentes</h3>
        <div className="space-y-4">
          {stats?.recentActivities?.length ? (
            stats.recentActivities.slice(0, 5).map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors">
                <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {activity.user?.name?.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {activity.user?.name} <span className="text-muted-foreground font-normal">{activity.description}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(activity.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade recente.</p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { BarChart3, TrendingUp, Users, Clock } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" /> 
            Relatórios e Análises
          </h1>
          <p className="text-muted-foreground text-sm">Visualize o desempenho detalhado da sua operação comercial.</p>
        </div>
        <button className="px-4 py-2 bg-card border border-border rounded-xl text-sm font-medium shadow-sm hover:bg-muted transition-colors">
          Exportar PDF
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-card border border-border p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center min-h-[300px]">
            <TrendingUp className="w-16 h-16 text-primary/20 mb-4" />
            <h3 className="font-bold text-xl mb-2">Módulo em Construção</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Os relatórios detalhados de conversão por funil, origem de leads e performance financeira estarão disponíveis em breve.
            </p>
        </div>
        <div className="bg-card border border-border p-8 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center min-h-[300px]">
            <Clock className="w-16 h-16 text-primary/20 mb-4" />
            <h3 className="font-bold text-xl mb-2">Métricas de Atendimento</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Tempo médio de resposta (TMA), quantidade de mensagens enviadas e qualidade do atendimento via WhatsApp.
            </p>
        </div>
      </div>
    </div>
  );
}

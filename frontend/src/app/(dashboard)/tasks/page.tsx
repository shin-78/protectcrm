'use client';
import { useState, useEffect } from 'react';
import { dashboardApi } from '@/services/api';
import { CheckSquare, Calendar, Loader2, Plus, Clock, Search, CheckCircle2, Circle, Users } from 'lucide-react';
import { formatRelative, cn } from '@/lib/utils';
import { isPast, isToday } from 'date-fns';

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const { data } = await dashboardApi.getTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const toggleTask = async (task: any) => {
    try {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isDone: !t.isDone } : t));
      await dashboardApi.updateTask(task.id, { isDone: !task.isDone });
    } catch (e) {
      // Revert on error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, isDone: task.isDone } : t));
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const pendingTasks = tasks.filter(t => !t.isDone);
  const doneTasks = tasks.filter(t => t.isDone);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary" /> 
            Minhas Tarefas
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie seus follow-ups e compromissos.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 gradient-primary text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4 bg-muted/10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Pesquisar tarefas..." 
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="p-0">
          {tasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma tarefa encontrada.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingTasks.map(task => {
                const dueDate = new Date(task.dueDate);
                const isLate = task.dueDate && isPast(dueDate) && !isToday(dueDate);
                
                return (
                  <div key={task.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors group">
                    <button onClick={() => toggleTask(task)} className="mt-1 text-muted-foreground hover:text-primary transition-colors">
                      <Circle className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{task.title}</h4>
                        <div className={cn(
                          "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md",
                          isLate ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-muted text-muted-foreground"
                        )}>
                          <Clock className="w-3 h-3" />
                          {task.dueDate ? formatRelative(task.dueDate) : 'Sem data'}
                        </div>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                      )}
                      {task.lead && (
                        <div className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                          <Users className="w-3 h-3" />
                          Lead: {task.lead.name}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {doneTasks.length > 0 && (
                <div className="p-4 bg-muted/30 border-y border-border/50 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Concluídas ({doneTasks.length})
                </div>
              )}

              {doneTasks.map(task => (
                <div key={task.id} className="flex items-start gap-4 p-4 opacity-60 hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleTask(task)} className="mt-1 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div className="flex-1 line-through text-muted-foreground">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && <p className="text-sm mt-1 line-clamp-1">{task.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { pipelineApi } from '@/services/api';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { formatCurrency, formatRelative } from '@/lib/utils';
import { Loader2, Plus, MessageSquare, CheckSquare, Search } from 'lucide-react';

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPipeline = async () => {
    try {
      const { data: pipelines } = await pipelineApi.getAll();
      if (pipelines.length > 0) {
        const { data } = await pipelineApi.getWithLeads(pipelines[0].id);
        setPipeline(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    
    const { source, destination, draggableId } = result;
    
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic UI update
    const sourceStage = pipeline.stages.find((s: any) => s.id === source.droppableId);
    const destStage = pipeline.stages.find((s: any) => s.id === destination.droppableId);
    
    const leadToMove = sourceStage.leads.find((l: any) => l.id === draggableId);
    
    sourceStage.leads = sourceStage.leads.filter((l: any) => l.id !== draggableId);
    destStage.leads.splice(destination.index, 0, { ...leadToMove, pipelineStageId: destStage.id });
    
    setPipeline({ ...pipeline });

    // API Call
    try {
      await pipelineApi.moveLead({
        leadId: draggableId,
        stageId: destination.droppableId,
        order: destination.index
      });
    } catch (e) {
      console.error('Failed to move lead');
      fetchPipeline(); // Revert on error
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!pipeline) return (
    <div className="p-8 text-center text-muted-foreground">Nenhum pipeline encontrado.</div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline Comercial</h1>
          <p className="text-muted-foreground text-sm">Gerencie seus leads arrastando entre as etapas.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar lead..." 
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4" /> Novo Lead
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden kanban-scroll">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full items-start min-w-max pb-4">
            {pipeline.stages.map((stage: any) => (
              <div key={stage.id} className="w-80 flex flex-col max-h-full bg-muted/30 rounded-2xl border border-border/50">
                {/* Stage Header */}
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-card rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <h3 className="font-semibold text-sm">{stage.name}</h3>
                  </div>
                  <div className="bg-muted px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground">
                    {stage.leads?.length || 0}
                  </div>
                </div>

                {/* Stage Content / Droppable area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div 
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-primary/5' : ''}`}
                    >
                      {stage.leads?.map((lead: any, index: number) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-card border rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/30 transition-colors
                                ${snapshot.isDragging ? 'shadow-lg border-primary/50 rotate-2' : 'border-border'}`}
                            >
                              <div className="font-medium text-sm mb-1">{lead.name}</div>
                              {lead.company && <div className="text-xs text-muted-foreground mb-2">{lead.company}</div>}
                              
                              {lead.tags && lead.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-3">
                                  {lead.tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[10px] rounded-md font-medium">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                                <div className="font-semibold text-xs text-foreground/80">
                                  {lead.value ? formatCurrency(lead.value) : '-'}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  {lead._count?.notes > 0 && (
                                    <div className="flex items-center gap-1 text-[10px]" title={`${lead._count.notes} notas`}>
                                      <MessageSquare className="w-3 h-3" /> {lead._count.notes}
                                    </div>
                                  )}
                                  {lead._count?.tasks > 0 && (
                                    <div className="flex items-center gap-1 text-[10px]" title={`${lead._count.tasks} tarefas`}>
                                      <CheckSquare className="w-3 h-3" /> {lead._count.tasks}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

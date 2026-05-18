import { Request, Response } from 'express';
import prisma from '../config/database';

export const getPipelines = async (req: any, res: Response): Promise<void> => {
  try {
    const pipelines = await prisma.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { leads: true } } },
        },
      },
    });
    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pipelines' });
  }
};

export const getPipelineWithLeads = async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const where: any = {};
    if (req.user.role === 'OPERATOR') where.operatorId = req.user.id;

    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order: 'asc' },
          include: {
            leads: {
              where,
              include: {
                operator: { select: { id: true, name: true, avatar: true } },
                _count: { select: { tasks: true, notes: true } },
              },
              orderBy: { updatedAt: 'desc' },
            },
          },
        },
      },
    });

    if (!pipeline) { res.status(404).json({ error: 'Pipeline não encontrado' }); return; }
    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar pipeline' });
  }
};

export const createPipeline = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, description, stages } = req.body;

    const pipeline = await prisma.pipeline.create({
      data: {
        name, description,
        stages: {
          create: (stages || [
            { name: 'Novo Lead', color: '#6366f1', order: 1 },
            { name: 'Em Atendimento', color: '#f59e0b', order: 2 },
            { name: 'Proposta', color: '#3b82f6', order: 3 },
            { name: 'Negociação', color: '#8b5cf6', order: 4 },
            { name: 'Fechado', color: '#10b981', order: 5 },
            { name: 'Perdido', color: '#ef4444', order: 6 },
          ]).map((s: any) => ({ name: s.name, color: s.color, order: s.order })),
        },
      },
      include: { stages: { orderBy: { order: 'asc' } } },
    });

    res.status(201).json(pipeline);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar pipeline' });
  }
};

export const updatePipeline = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    const pipeline = await prisma.pipeline.update({
      where: { id: req.params.id },
      data: { name, description },
      include: { stages: { orderBy: { order: 'asc' } } },
    });
    res.json(pipeline);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar pipeline' });
  }
};

export const moveLeadStage = async (req: any, res: Response): Promise<void> => {
  try {
    const { leadId, stageId, order } = req.body;

    const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
    if (!stage) { res.status(404).json({ error: 'Etapa não encontrada' }); return; }

    const statusMap: Record<string, string> = {
      'Novo Lead': 'NEW',
      'Em Atendimento': 'IN_PROGRESS',
      'Proposta': 'PROPOSAL',
      'Negociação': 'NEGOTIATION',
      'Fechado': 'CLOSED',
      'Perdido': 'LOST',
    };

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        pipelineStageId: stageId,
        status: (statusMap[stage.name] || 'IN_PROGRESS') as any,
      },
    });

    await prisma.activity.create({
      data: {
        leadId, userId: req.user.id,
        action: 'STAGE_CHANGED',
        description: `Movido para: ${stage.name}`,
      },
    });

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao mover lead' });
  }
};

export const createStage = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, color, order } = req.body;
    const stage = await prisma.pipelineStage.create({
      data: { pipelineId: req.params.id, name, color: color || '#6366f1', order },
    });
    res.status(201).json(stage);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar etapa' });
  }
};

export const updateStage = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, color, order } = req.body;
    const stage = await prisma.pipelineStage.update({
      where: { id: req.params.stageId },
      data: { name, color, order },
    });
    res.json(stage);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar etapa' });
  }
};

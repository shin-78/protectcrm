import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

export const getLeads = async (req: any, res: Response): Promise<void> => {
  try {
    const { status, search, pipelineStageId, operatorId, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (req.user.role === 'OPERATOR') where.operatorId = req.user.id;
    if (operatorId && req.user.role !== 'OPERATOR') where.operatorId = operatorId;
    if (status) where.status = status;
    if (pipelineStageId) where.pipelineStageId = pipelineStageId;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          operator: { select: { id: true, name: true, avatar: true } },
          pipelineStage: { select: { id: true, name: true, color: true } },
          _count: { select: { tasks: true, notes: true, conversations: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    logger.error('Get leads error', { error });
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
};

export const getLeadById = async (req: any, res: Response): Promise<void> => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.id },
      include: {
        operator: { select: { id: true, name: true, avatar: true, email: true } },
        pipelineStage: { select: { id: true, name: true, color: true, pipeline: { select: { name: true } } } },
        tasks: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        notes: { include: { user: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: 'desc' } },
        activities: { include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 50 },
        conversations: {
          include: {
            session: { select: { userId: true, phoneNumber: true } },
            _count: { select: { messages: true } },
          },
          orderBy: { lastMessageAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!lead) { res.status(404).json({ error: 'Lead não encontrado' }); return; }
    if (req.user.role === 'OPERATOR' && lead.operatorId !== req.user.id) {
      res.status(403).json({ error: 'Acesso negado' }); return;
    }
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
};

export const createLead = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, position, source, value, tags, pipelineStageId } = req.body;

    const lead = await prisma.lead.create({
      data: {
        name, email, phone, company, position, source, value: value ? parseFloat(value) : null,
        tagsStr: tags ? JSON.stringify(tags) : '[]', pipelineStageId,
        operatorId: req.user.role === 'OPERATOR' ? req.user.id : req.body.operatorId || req.user.id,
        status: 'NEW',
      },
      include: {
        operator: { select: { id: true, name: true, avatar: true } },
        pipelineStage: { select: { id: true, name: true, color: true } },
      },
    });

    await prisma.activity.create({
      data: {
        leadId: lead.id, userId: req.user.id,
        action: 'LEAD_CREATED', description: `Lead ${lead.name} criado`,
      },
    });

    res.status(201).json(lead);
  } catch (error) {
    logger.error('Create lead error', { error });
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
};

export const updateLead = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, phone, company, position, source, status, value, tags, pipelineStageId, operatorId, lostReason } = req.body;

    const existing = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Lead não encontrado' }); return; }

    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: {
        name, email, phone, company, position, source,
        status, value: value ? parseFloat(value) : undefined,
        tagsStr: tags ? JSON.stringify(tags) : undefined, pipelineStageId, lostReason,
        operatorId: req.user.role !== 'OPERATOR' ? operatorId : undefined,
      },
      include: {
        operator: { select: { id: true, name: true, avatar: true } },
        pipelineStage: { select: { id: true, name: true, color: true } },
      },
    });

    if (status && status !== existing.status) {
      await prisma.activity.create({
        data: {
          leadId: lead.id, userId: req.user.id,
          action: 'STATUS_CHANGED',
          description: `Status alterado de ${existing.status} para ${status}`,
        },
      });
    }

    if (pipelineStageId && pipelineStageId !== existing.pipelineStageId) {
      const stage = await prisma.pipelineStage.findUnique({ where: { id: pipelineStageId } });
      await prisma.activity.create({
        data: {
          leadId: lead.id, userId: req.user.id,
          action: 'STAGE_CHANGED',
          description: `Movido para etapa: ${stage?.name}`,
        },
      });
    }

    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
};

export const deleteLead = async (req: any, res: Response): Promise<void> => {
  try {
    await prisma.lead.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lead removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover lead' });
  }
};

export const importLeads = async (req: any, res: Response): Promise<void> => {
  try {
    const leads = req.body.leads as any[];
    if (!leads?.length) { res.status(400).json({ error: 'Nenhum lead para importar' }); return; }

    const created = await prisma.lead.createMany({
      data: leads.map(l => ({
        name: l.name, email: l.email, phone: l.phone,
        company: l.company, source: l.source || 'CSV_IMPORT',
        operatorId: req.user.id, status: 'NEW', tagsStr: '[]',
      })),
    });

    res.json({ imported: created.count });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao importar leads' });
  }
};

export const getLeadStats = async (req: any, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {};
    if (req.user.role === 'OPERATOR') where.operatorId = req.user.id;

    const [total, todayLeads, closed, lost, byStatus] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: today } } }),
      prisma.lead.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.lead.count({ where: { ...where, status: 'LOST' } }),
      prisma.lead.groupBy({ by: ['status'], where, _count: true }),
    ]);

    const totalRevenue = await prisma.lead.aggregate({
      where: { ...where, status: 'CLOSED' },
      _sum: { value: true },
    });

    res.json({
      total, todayLeads, closed, lost,
      totalRevenue: totalRevenue._sum.value || 0,
      conversionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      byStatus: byStatus.reduce((acc: any, s) => { acc[s.status] = s._count; return acc; }, {}),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

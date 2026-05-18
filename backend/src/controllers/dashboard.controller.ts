import { Request, Response } from 'express';
import prisma from '../config/database';

export const getDashboardStats = async (req: any, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const where: any = {};
    if (req.user.role === 'OPERATOR') where.operatorId = req.user.id;

    const [
      totalLeads, todayLeads, closedLeads, lostLeads,
      totalRevenue, operators, onlineOperators,
      messagesSent, messagesReceived,
      monthLeads, lastMonthLeads,
      byStatus, recentActivities,
    ] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: today } } }),
      prisma.lead.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.lead.count({ where: { ...where, status: 'LOST' } }),
      prisma.lead.aggregate({ where: { ...where, status: 'CLOSED' }, _sum: { value: true } }),
      req.user.role !== 'OPERATOR' ? prisma.user.count({ where: { role: { in: ['OPERATOR', 'SUPERVISOR'] }, isActive: true } }) : Promise.resolve(0),
      req.user.role !== 'OPERATOR' ? prisma.whatsappSession.count({ where: { status: 'CONNECTED' } }) : Promise.resolve(0),
      prisma.message.count({ where: { direction: 'OUTBOUND', createdAt: { gte: thisMonth } } }),
      prisma.message.count({ where: { direction: 'INBOUND', createdAt: { gte: thisMonth } } }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: thisMonth } } }),
      prisma.lead.count({ where: { ...where, createdAt: { gte: lastMonth, lt: thisMonth } } }),
      prisma.lead.groupBy({ by: ['status'], where, _count: true }),
      prisma.activity.findMany({
        where: req.user.role === 'OPERATOR' ? { userId: req.user.id } : {},
        include: { user: { select: { id: true, name: true, avatar: true } }, lead: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    // Monthly leads chart (last 6 months)
    const monthlyData = await Promise.all(
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return prisma.lead.count({ where: { ...where, createdAt: { gte: start, lte: end } } })
          .then(count => ({
            month: start.toLocaleString('pt-BR', { month: 'short' }),
            leads: count,
          }));
      })
    );

    const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;
    const growth = lastMonthLeads > 0 ? Math.round(((monthLeads - lastMonthLeads) / lastMonthLeads) * 100) : 0;

    res.json({
      totalLeads,
      todayLeads,
      closedLeads,
      lostLeads,
      totalRevenue: totalRevenue._sum.value || 0,
      conversionRate,
      operators,
      onlineOperators,
      messagesSent,
      messagesReceived,
      monthLeads,
      growth,
      byStatus: byStatus.reduce((acc: any, s) => { acc[s.status] = s._count; return acc; }, {}),
      monthlyChart: monthlyData.reverse(),
      recentActivities,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar dashboard' });
  }
};

export const getOperatorRanking = async (req: any, res: Response): Promise<void> => {
  try {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const operators = await prisma.user.findMany({
      where: { role: { in: ['OPERATOR', 'SUPERVISOR'] }, isActive: true },
      select: {
        id: true, name: true, avatar: true,
        whatsappSession: { select: { status: true } },
        leads: {
          where: { createdAt: { gte: thisMonth } },
          select: { status: true, value: true },
        },
        messages: {
          where: { createdAt: { gte: thisMonth }, direction: 'OUTBOUND' },
          select: { id: true },
        },
      },
    });

    const ranking = operators
      .map(op => ({
        id: op.id,
        name: op.name,
        avatar: op.avatar,
        isOnline: op.whatsappSession?.status === 'CONNECTED',
        leads: op.leads.length,
        conversions: op.leads.filter(l => l.status === 'CLOSED').length,
        revenue: op.leads.filter(l => l.status === 'CLOSED').reduce((s, l) => s + (l.value || 0), 0),
        messages: op.messages.length,
        rate: op.leads.length > 0
          ? Math.round((op.leads.filter(l => l.status === 'CLOSED').length / op.leads.length) * 100)
          : 0,
      }))
      .sort((a, b) => b.conversions - a.conversions);

    res.json(ranking);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar ranking' });
  }
};

// Notes
export const createNote = async (req: any, res: Response): Promise<void> => {
  try {
    const { leadId, content, isInternal } = req.body;
    const note = await prisma.note.create({
      data: { leadId, userId: req.user.id, content, isInternal: isInternal !== false },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });
    await prisma.activity.create({
      data: { leadId, userId: req.user.id, action: 'NOTE_ADDED', description: 'Anotação adicionada' },
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar nota' });
  }
};

// Tasks
export const getTasks = async (req: any, res: Response): Promise<void> => {
  try {
    const { leadId, isDone } = req.query;
    const where: any = { userId: req.user.id };
    if (leadId) where.leadId = leadId;
    if (isDone !== undefined) where.isDone = isDone === 'true';

    const tasks = await prisma.task.findMany({
      where,
      include: {
        lead: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ isDone: 'asc' }, { dueDate: 'asc' }],
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
};

export const createTask = async (req: any, res: Response): Promise<void> => {
  try {
    const { leadId, title, description, dueDate, priority } = req.body;
    const task = await prisma.task.create({
      data: { leadId, userId: req.user.id, title, description, dueDate: dueDate ? new Date(dueDate) : null, priority: priority || 'MEDIUM' },
      include: { lead: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
    });
    if (leadId) {
      await prisma.activity.create({
        data: { leadId, userId: req.user.id, action: 'TASK_CREATED', description: `Tarefa criada: ${title}` },
      });
    }
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
};

export const updateTask = async (req: any, res: Response): Promise<void> => {
  try {
    const { title, description, dueDate, isDone, priority } = req.body;
    const task = await prisma.task.update({
      where: { id: req.params.id },
      data: { title, description, dueDate: dueDate ? new Date(dueDate) : undefined, isDone, priority },
      include: { lead: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
};

export const deleteTask = async (req: any, res: Response): Promise<void> => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: 'Tarefa removida' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover tarefa' });
  }
};

// Notifications
export const getNotifications = async (req: any, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unread = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
    res.json({ notifications, unread });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar notificações' });
  }
};

export const markNotificationsRead = async (req: any, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
    res.json({ message: 'Notificações marcadas como lidas' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao marcar notificações' });
  }
};

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import logger from '../config/logger';

export const getUsers = async (req: any, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, phone: true, isActive: true, lastSeen: true,
        whatsappSession: { select: { status: true, phoneNumber: true, profileName: true } },
        _count: { select: { leads: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
};

export const getUserById = async (req: any, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, email: true, role: true,
        avatar: true, phone: true, isActive: true, lastSeen: true,
        whatsappSession: { select: { status: true, phoneNumber: true, profileName: true } },
        _count: { select: { leads: true, tasks: true } },
      },
    });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
};

export const createUser = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone } = req.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(400).json({ error: 'Email já cadastrado' }); return; }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role, phone },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
};

export const updateUser = async (req: any, res: Response): Promise<void> => {
  try {
    const { name, email, role, phone, isActive, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, role, phone, isActive, avatar },
      select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, avatar: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
};

export const deleteUser = async (req: any, res: Response): Promise<void> => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Usuário removido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
};

export const getOperatorStats = async (req: any, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate as string) : new Date();

    const operators = await prisma.user.findMany({
      where: { role: { in: ['OPERATOR', 'SUPERVISOR'] }, isActive: true },
      select: {
        id: true, name: true, avatar: true,
        leads: {
          where: { createdAt: { gte: start, lte: end } },
          select: { status: true, value: true },
        },
        messages: {
          where: { createdAt: { gte: start, lte: end }, direction: 'OUTBOUND' },
          select: { id: true },
        },
        whatsappSession: { select: { status: true } },
      },
    });

    const stats = operators.map(op => ({
      id: op.id,
      name: op.name,
      avatar: op.avatar,
      isOnline: op.whatsappSession?.status === 'CONNECTED',
      totalLeads: op.leads.length,
      closedLeads: op.leads.filter(l => l.status === 'CLOSED').length,
      lostLeads: op.leads.filter(l => l.status === 'LOST').length,
      totalRevenue: op.leads.filter(l => l.status === 'CLOSED').reduce((s, l) => s + (l.value || 0), 0),
      messagesSent: op.messages.length,
      conversionRate: op.leads.length > 0
        ? Math.round((op.leads.filter(l => l.status === 'CLOSED').length / op.leads.length) * 100)
        : 0,
    }));

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
};

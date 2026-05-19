import { Request, Response } from 'express';
import prisma from '../config/database';
import { BaileysService } from '../services/baileys.service';
import logger from '../config/logger';

export const connectWhatsapp = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const instanceName = `crm_user_${userId}`;
    const { io } = req.app.locals;

    // Upsert session record
    await prisma.whatsappSession.upsert({
      where: { userId },
      create: { userId, instanceName, status: 'CONNECTING' },
      update: { status: 'CONNECTING' },
    });

    // Emit function to push events to this user via Socket.io
    const emitFn = (event: string, data: any) => {
      io?.to(`user:${userId}`).emit(event, data);
    };

    // Start Baileys connection (async — QR code comes via socket)
    BaileysService.connectInstance(instanceName, emitFn).catch((err) => {
      logger.error('Baileys connect error', { error: err.message });
    });

    // Immediately return — QR code arrives via socket event 'whatsapp_qr'
    res.json({ status: 'CONNECTING', instanceName, message: 'Aguarde o QR code via WebSocket' });
  } catch (error: any) {
    logger.error('Connect WhatsApp error', { error: error.message });
    res.status(500).json({ error: 'Erro ao conectar WhatsApp: ' + error.message });
  }
};

export const getSessionStatus = async (req: any, res: Response): Promise<void> => {
  try {
    const userId = req.user.id;
    const instanceName = `crm_user_${userId}`;

    const session = await prisma.whatsappSession.findUnique({
      where: { userId },
      select: {
        status: true, phoneNumber: true, profileName: true,
        profilePicture: true, qrCode: true, instanceName: true,
        connectedAt: true,
      },
    });

    // Check live Baileys status
    const live = BaileysService.getSession(instanceName);
    const liveStatus = live?.status || null;

    if (!session) {
      res.json({ status: 'DISCONNECTED' });
      return;
    }

    // Sync DB with live status
    if (liveStatus === 'connected' && session.status !== 'CONNECTED') {
      await prisma.whatsappSession.update({
        where: { userId },
        data: { status: 'CONNECTED', connectedAt: new Date(), qrCode: null },
      });
      session.status = 'CONNECTED';
    }

    res.json({ ...session, liveStatus });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
};


export const disconnectWhatsapp = async (req: any, res: Response): Promise<void> => {
  try {
    const session = await prisma.whatsappSession.findUnique({ where: { userId: req.user.id } });
    if (!session) { res.status(404).json({ error: 'Sessão não encontrada' }); return; }

    await BaileysService.disconnectInstance(session.instanceName);

    await prisma.whatsappSession.update({
      where: { userId: req.user.id },
      data: { status: 'DISCONNECTED', disconnectedAt: new Date(), qrCode: null },
    });

    res.json({ message: 'WhatsApp desconectado' });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao desconectar: ' + error.message });
  }
};

export const getConversations = async (req: any, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const session = await prisma.whatsappSession.findUnique({ where: { userId: req.user.id } });

    const where: any = {};
    if (req.user.role === 'OPERATOR') {
      if (!session) { res.json({ conversations: [], total: 0 }); return; }
      where.sessionId = session.id;
    }
    if (search) {
      where.OR = [
        { remoteName: { contains: search as string, mode: 'insensitive' } },
        { remoteJid: { contains: search as string } },
        { lastMessageText: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          session: { select: { userId: true, phoneNumber: true, user: { select: { name: true, avatar: true } } } },
          lead: { select: { id: true, name: true, company: true, tagsStr: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      prisma.conversation.count({ where }),
    ]);

    res.json({ conversations, total });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar conversas' });
  }
};

export const getMessages = async (req: any, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { session: true },
    });
    if (!conversation) { res.status(404).json({ error: 'Conversa não encontrada' }); return; }

    if (req.user.role === 'OPERATOR' && conversation.session.userId !== req.user.id) {
      res.status(403).json({ error: 'Acesso negado' }); return;
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where: { conversationId },
        skip,
        take: Number(limit),
        include: { sender: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count({ where: { conversationId } }),
    ]);

    // Mark as read
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    res.json({ messages: messages.reverse(), total });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
};

export const sendMessage = async (req: any, res: Response): Promise<void> => {
  try {
    const { conversationId, text, mediaUrl, mediaType, fileName } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { session: true },
    });
    if (!conversation) { res.status(404).json({ error: 'Conversa não encontrada' }); return; }
    if (req.user.role === 'OPERATOR' && conversation.session.userId !== req.user.id) {
      res.status(403).json({ error: 'Acesso negado' }); return;
    }
    if (conversation.session.status !== 'CONNECTED') {
      res.status(400).json({ error: 'WhatsApp não conectado' }); return;
    }

    let result: any;
    const type = mediaType || 'TEXT';

    if (type === 'TEXT') {
      result = await BaileysService.sendMessage(
        conversation.session.instanceName, conversation.remoteJid, text
      );
    } else {
      result = await BaileysService.sendMediaMessage(
        conversation.session.instanceName, conversation.remoteJid,
        type.toLowerCase() as any, mediaUrl, text, fileName
      );
    }

    const message = await prisma.message.create({
      data: {
        conversationId, senderId: req.user.id,
        messageId: result?.key?.id,
        type: type as any, direction: 'OUTBOUND',
        content: text, mediaUrl, mediaMimeType: mediaType,
        fileName, isRead: true,
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), lastMessageText: text || `[${type}]` },
    });

    res.json(message);
  } catch (error: any) {
    logger.error('Send message error', { error: error.message });
    res.status(500).json({ error: 'Erro ao enviar mensagem: ' + error.message });
  }
};

export const handleWebhook = async (req: any, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const payload = req.body;

    logger.info('Webhook received', { userId, event: payload.event });

    const session = await prisma.whatsappSession.findUnique({ where: { userId } });
    if (!session) { res.json({ ok: true }); return; }

    const { io } = req.app.locals;

    if (payload.event === 'QRCODE_UPDATED') {
      const qrCode = payload.data?.qrcode?.base64 || payload.data?.base64;
      await prisma.whatsappSession.update({
        where: { id: session.id },
        data: { status: 'QR_CODE', qrCode },
      });
      io?.to(`user:${userId}`).emit('qr_code', { qrCode });
    }

    if (payload.event === 'CONNECTION_UPDATE') {
      const state = payload.data?.state;
      if (state === 'open') {
        const profileName = payload.data?.instance?.profileName;
        const phoneNumber = payload.data?.instance?.wuid?.split('@')[0];
        await prisma.whatsappSession.update({
          where: { id: session.id },
          data: { status: 'CONNECTED', connectedAt: new Date(), qrCode: null, profileName, phoneNumber },
        });
        io?.to(`user:${userId}`).emit('whatsapp_connected', { status: 'CONNECTED', profileName, phoneNumber });
      } else if (['close', 'refused'].includes(state)) {
        await prisma.whatsappSession.update({
          where: { id: session.id },
          data: { status: 'DISCONNECTED', disconnectedAt: new Date() },
        });
        io?.to(`user:${userId}`).emit('whatsapp_disconnected', { status: 'DISCONNECTED' });
      }
    }

    if (payload.event === 'MESSAGES_UPSERT') {
      const msgs = Array.isArray(payload.data?.messages) ? payload.data.messages : [payload.data];

      for (const msg of msgs) {
        if (!msg?.key?.remoteJid || msg.key.remoteJid === 'status@broadcast') continue;

        const remoteJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        if (fromMe) continue; // We handle outbound separately

        const remoteName = msg.pushName || msg.verifiedBizName || remoteJid.split('@')[0];
        const content = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || msg.message?.imageMessage?.caption
          || msg.message?.videoMessage?.caption
          || null;

        let type = 'TEXT';
        if (msg.message?.imageMessage) type = 'IMAGE';
        else if (msg.message?.audioMessage || msg.message?.pttMessage) type = 'AUDIO';
        else if (msg.message?.videoMessage) type = 'VIDEO';
        else if (msg.message?.documentMessage) type = 'DOCUMENT';

        const conversation = await prisma.conversation.upsert({
          where: { sessionId_remoteJid: { sessionId: session.id, remoteJid } },
          create: {
            sessionId: session.id, remoteJid, remoteName,
            lastMessageAt: new Date(), lastMessageText: content || `[${type}]`,
            unreadCount: 1,
          },
          update: {
            remoteName,
            lastMessageAt: new Date(),
            lastMessageText: content || `[${type}]`,
            unreadCount: { increment: 1 },
          },
        });

        const message = await prisma.message.create({
          data: {
            conversationId: conversation.id,
            messageId: msg.key.id,
            type: type as any,
            direction: 'INBOUND',
            content,
            isRead: false,
          },
        });

        const fullConversation = await prisma.conversation.findUnique({
          where: { id: conversation.id },
          include: {
            session: { select: { userId: true, user: { select: { name: true } } } },
            lead: { select: { id: true, name: true } },
          },
        });

        io?.to(`user:${userId}`).emit('new_message', { message, conversation: fullConversation });
        io?.to('role:MASTER').emit('new_message', { message, conversation: fullConversation });
        io?.to('role:SUPERVISOR').emit('new_message', { message, conversation: fullConversation });
      }
    }

    res.json({ ok: true });
  } catch (error: any) {
    logger.error('Webhook error', { error: error.message });
    res.json({ ok: true }); // Always respond OK to avoid retries
  }
};

export const linkConversationToLead = async (req: any, res: Response): Promise<void> => {
  try {
    const { conversationId, leadId } = req.body;
    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { leadId },
      include: { lead: { select: { id: true, name: true, company: true } } },
    });
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao vincular conversa' });
  }
};

import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  proto,
  WAMessage
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import * as path from 'path';
import * as fs from 'fs';
import logger from '../config/logger';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

const baileysLogger = pino({ level: 'silent' });

const prisma = new PrismaClient();

interface WASession {
  socket: ReturnType<typeof makeWASocket> | null;
  status: 'disconnected' | 'connecting' | 'qr' | 'connected';
  qrCode?: string;
  phone?: string;
}

const sessions = new Map<string, WASession>();
const AUTH_DIR = path.join(process.cwd(), 'whatsapp-sessions');

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

export class BaileysService {
  static async init(io: any): Promise<void> {
    try {
      const activeSessions = await prisma.whatsappSession.findMany({
        where: {
          status: { in: ['CONNECTED', 'CONNECTING', 'QR_CODE'] }
        }
      });
      logger.info(`Auto-reconnecting ${activeSessions.length} WhatsApp sessions...`);
      for (const sess of activeSessions) {
        const emitFn = (event: string, data: any) => {
          io?.to(`user:${sess.userId}`).emit(event, data);
          if (event === 'new_message') {
            io?.to('role:MASTER').emit(event, data);
            io?.to('role:SUPERVISOR').emit(event, data);
          }
        };
        BaileysService.connectInstance(sess.instanceName, emitFn).catch(err => {
          logger.error(`Error auto-reconnecting ${sess.instanceName}:`, err);
        });
      }
    } catch (err: any) {
      logger.error('Error initializing Baileys sessions:', err);
    }
  }

  static async connectInstance(instanceName: string, emitFn: (event: string, data: any) => void): Promise<void> {
    // If already connected, skip
    const existing = sessions.get(instanceName);
    if (existing?.status === 'connected') {
      emitFn('whatsapp_status', { status: 'connected', phone: existing.phone });
      return;
    }

    // Set up auth state
    const authDir = path.join(AUTH_DIR, instanceName);
    if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const session: WASession = { socket: null, status: 'connecting' };
    sessions.set(instanceName, session);

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: baileysLogger as any,
      browser: ['ProtectCRM', 'Chrome', '1.0.0'],
    });

    session.socket = sock;

    sock.ev.on('creds.update', saveCreds);

    // Helper to import/sync a contact as a Lead
    const syncContactAsLead = async (contact: any) => {
      try {
        if (!contact.id || contact.id.endsWith('@g.us') || contact.id === 'status@broadcast') return;
        const phone = contact.id.split('@')[0];
        
        // Extract userId from instanceName (e.g. crm_user_12345)
        const userId = instanceName.startsWith('crm_user_') ? instanceName.replace('crm_user_', '') : null;
        if (!userId) return;

        // Skip if user doesn't exist
        const userExists = await prisma.user.findUnique({ where: { id: userId } });
        if (!userExists) return;

        const name = contact.name || contact.verifiedName || contact.notify || phone;

        // Find default pipeline stage
        const firstStage = await prisma.pipelineStage.findFirst({
          orderBy: { order: 'asc' }
        });
        const pipelineStageId = firstStage?.id || null;

        // Check if lead already exists for this operator and phone
        let lead = await prisma.lead.findFirst({
          where: { phone, operatorId: userId }
        });

        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              name,
              phone,
              operatorId: userId,
              pipelineStageId,
              status: 'NEW',
              source: 'WHATSAPP',
            }
          });
          logger.info(`Saved contact ${name} (${phone}) as new lead`);

          // Log activity
          await prisma.activity.create({
            data: {
              leadId: lead.id,
              userId: userId,
              action: 'LEAD_CREATED',
              description: `Lead ${name} importado automaticamente do WhatsApp`,
            }
          }).catch(() => {});
        } else {
          // Update name if it was just the phone number before
          if (lead.name === phone && name !== phone) {
            lead = await prisma.lead.update({
              where: { id: lead.id },
              data: { name }
            });
            logger.info(`Updated lead name for ${phone} to ${name}`);
          }
        }

        // Also check if there is an existing conversation for this contact/session
        // Let's get the whatsappSession first
        const dbSession = await prisma.whatsappSession.findUnique({
          where: { userId }
        });
        if (dbSession) {
          const conversation = await prisma.conversation.findUnique({
            where: { sessionId_remoteJid: { sessionId: dbSession.id, remoteJid: contact.id } }
          });
          if (conversation && !conversation.leadId) {
            await prisma.conversation.update({
              where: { id: conversation.id },
              data: { leadId: lead.id }
            });
          }
        }
      } catch (err: any) {
        logger.error('Error syncing contact as lead:', err.message);
      }
    };

    sock.ev.on('messaging-history.set', async ({ contacts }) => {
      logger.info(`Received history set with ${contacts?.length || 0} contacts`);
      if (contacts) {
        for (const contact of contacts) {
          await syncContactAsLead(contact);
        }
      }
    });

    sock.ev.on('contacts.upsert', async (contacts) => {
      logger.info(`Received contacts.upsert with ${contacts?.length || 0} contacts`);
      for (const contact of contacts) {
        await syncContactAsLead(contact);
      }
    });

    sock.ev.on('contacts.update', async (contacts) => {
      logger.info(`Received contacts.update with ${contacts?.length || 0} contacts`);
      for (const contact of contacts) {
        await syncContactAsLead(contact);
      }
    });

    // Handle incoming/outgoing messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        try {
          const remoteJid = msg.key.remoteJid;
          const fromMe = msg.key.fromMe;
          const messageId = msg.key.id;

          if (!remoteJid || remoteJid === 'status@broadcast') continue;

          const phone = remoteJid.split('@')[0];
          const userId = instanceName.replace('crm_user_', '');

          // Get DB session to get sessionId
          const dbSession = await prisma.whatsappSession.findUnique({
            where: { userId }
          });
          if (!dbSession) continue;

          // Find lead
          const lead = await prisma.lead.findFirst({
            where: { phone, operatorId: userId }
          });

          const content = msg.message?.conversation
            || msg.message?.extendedTextMessage?.text
            || msg.message?.imageMessage?.caption
            || msg.message?.videoMessage?.caption
            || null;

          let msgType = 'TEXT';
          let mediaMimeType = null;
          let fileName = null;

          if (msg.message?.imageMessage) {
            msgType = 'IMAGE';
            mediaMimeType = msg.message.imageMessage.mimetype;
          } else if (msg.message?.audioMessage) {
            msgType = 'AUDIO';
            mediaMimeType = msg.message.audioMessage.mimetype;
          } else if (msg.message?.videoMessage) {
            msgType = 'VIDEO';
            mediaMimeType = msg.message.videoMessage.mimetype;
          } else if (msg.message?.documentMessage) {
            msgType = 'DOCUMENT';
            mediaMimeType = msg.message.documentMessage.mimetype;
            fileName = msg.message.documentMessage.fileName;
          }

          const remoteName = msg.pushName || phone;

          // Upsert conversation
          const conversation = await prisma.conversation.upsert({
            where: { sessionId_remoteJid: { sessionId: dbSession.id, remoteJid } },
            create: {
              sessionId: dbSession.id,
              remoteJid,
              remoteName,
              lastMessageAt: new Date(),
              lastMessageText: content || `[${msgType}]`,
              unreadCount: fromMe ? 0 : 1,
              leadId: lead?.id || null,
            },
            update: {
              remoteName,
              lastMessageAt: new Date(),
              lastMessageText: content || `[${msgType}]`,
              unreadCount: fromMe ? 0 : { increment: 1 },
              leadId: lead?.id || null,
            },
          });

          // Check duplicate
          const msgExists = await prisma.message.findFirst({
            where: { messageId }
          });

          if (!msgExists) {
            const dbMessage = await prisma.message.create({
              data: {
                conversationId: conversation.id,
                messageId,
                type: msgType as any,
                direction: fromMe ? 'OUTBOUND' : 'INBOUND',
                content,
                mediaMimeType,
                fileName,
                isRead: fromMe ? true : false,
                senderId: fromMe ? userId : null,
              },
            });

            const fullConversation = await prisma.conversation.findUnique({
              where: { id: conversation.id },
              include: {
                session: { select: { userId: true, user: { select: { name: true } } } },
                lead: { select: { id: true, name: true } },
              },
            });

            emitFn('new_message', { message: dbMessage, conversation: fullConversation });
          }
        } catch (err: any) {
          logger.error('Error handling messages.upsert:', err);
        }
      }
    });

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Generate QR code as base64 image
        const qrImage = await QRCode.toDataURL(qr);
        session.qrCode = qrImage;
        session.status = 'qr';
        emitFn('whatsapp_qr', { qrCode: qrImage });
        logger.info(`QR code generated for instance: ${instanceName}`);

        // Update DB
        const userId = instanceName.startsWith('crm_user_') ? instanceName.replace('crm_user_', '') : null;
        if (userId) {
          await prisma.whatsappSession.update({
            where: { userId },
            data: { status: 'QR_CODE', qrCode: qrImage }
          }).catch(() => {});
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        session.status = 'disconnected';
        emitFn('whatsapp_status', { status: 'disconnected' });

        // Update DB
        await prisma.whatsappSession.updateMany({
          where: { instanceName },
          data: { status: 'DISCONNECTED', qrCode: null },
        }).catch(() => {});

        if (shouldReconnect) {
          logger.info(`Reconnecting WhatsApp instance: ${instanceName}`);
          setTimeout(() => BaileysService.connectInstance(instanceName, emitFn), 3000);
        } else {
          // Logged out — clear auth files
          sessions.delete(instanceName);
          fs.rmSync(path.join(AUTH_DIR, instanceName), { recursive: true, force: true });
        }
      }

      if (connection === 'open') {
        const phone = sock.user?.id?.split(':')[0] || '';
        session.status = 'connected';
        session.phone = phone;
        emitFn('whatsapp_status', { status: 'connected', phone });
        logger.info(`WhatsApp connected: ${instanceName} (${phone})`);

        // Also update db session to CONNECTED
        const userId = instanceName.startsWith('crm_user_') ? instanceName.replace('crm_user_', '') : null;
        if (userId) {
          await prisma.whatsappSession.update({
            where: { userId },
            data: { status: 'CONNECTED', phoneNumber: phone, connectedAt: new Date(), qrCode: null }
          }).catch(err => logger.error('Error updating session DB:', err));
        }
      }
    });
  }

  static getSession(instanceName: string): WASession | undefined {
    return sessions.get(instanceName);
  }

  static async disconnectInstance(instanceName: string): Promise<void> {
    const session = sessions.get(instanceName);
    if (session?.socket) {
      await session.socket.logout();
      sessions.delete(instanceName);
    }
  }

  static async sendMessage(instanceName: string, to: string, message: string): Promise<any> {
    const session = sessions.get(instanceName);
    if (!session?.socket || session.status !== 'connected') {
      throw new Error('WhatsApp not connected');
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    const result = await session.socket.sendMessage(jid, { text: message });
    return result;
  }

  static async sendMediaMessage(instanceName: string, to: string, type: 'image' | 'video' | 'audio' | 'document', url: string, caption?: string, fileName?: string): Promise<any> {
    const session = sessions.get(instanceName);
    if (!session?.socket || session.status !== 'connected') {
      throw new Error('WhatsApp not connected');
    }
    const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`;
    
    let content: any = {};
    if (type === 'image') {
      content = { image: { url }, caption };
    } else if (type === 'video') {
      content = { video: { url }, caption };
    } else if (type === 'audio') {
      content = { audio: { url }, mimetype: 'audio/mp4' };
    } else if (type === 'document') {
      content = { document: { url }, fileName };
    }
    
    const result = await session.socket.sendMessage(jid, content);
    return result;
  }
}

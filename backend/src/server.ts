import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import path from 'path';

import logger from './config/logger';
import { errorHandler, notFound } from './middlewares/error.middleware';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import leadsRoutes from './routes/leads.routes';
import pipelineRoutes from './routes/pipeline.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import dashboardRoutes from './routes/dashboard.routes';
import { BaileysService } from './services/baileys.service';

const app = express();
const httpServer = createServer(app);

// WebSocket
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Share io instance
app.locals.io = io;

// Security
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});
app.use('/api/', limiter);

// Middlewares
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0', timestamp: new Date() }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

// Socket.IO authentication and events
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    const jwt = await import('jsonwebtoken');
    const decoded = jwt.default.verify(token, process.env.JWT_SECRET!) as any;
    socket.data.user = decoded;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  logger.info('Socket connected', { userId: user?.id, name: user?.name });

  // Join user-specific room
  socket.join(`user:${user.id}`);
  // Join role-specific room for broadcasts
  socket.join(`role:${user.role}`);

  socket.on('join_conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('leave_conversation', (conversationId: string) => {
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('typing', ({ conversationId }: { conversationId: string }) => {
    socket.to(`conversation:${conversationId}`).emit('user_typing', { userId: user.id, name: user.name });
  });

  socket.on('disconnect', () => {
    logger.info('Socket disconnected', { userId: user?.id });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 WebSocket ready`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Initialize and auto-reconnect WhatsApp sessions
  BaileysService.init(io);
});

export { io };

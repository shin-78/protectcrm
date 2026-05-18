'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useNotificationStore, useWAStore } from '@/store';

let socket: Socket | null = null;

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore();
  const { addNotification } = useNotificationStore();
  const { setSession } = useWAStore();

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    if (socket?.connected) return;

    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => console.log('✅ Socket connected:', socket?.id));
    socket.on('disconnect', () => console.log('❌ Socket disconnected'));

    socket.on('qr_code', ({ qrCode }: { qrCode: string }) => {
      setSession({ status: 'QR_CODE', qrCode });
    });

    socket.on('whatsapp_connected', (data: any) => {
      setSession({ status: 'CONNECTED', qrCode: undefined, ...data });
    });

    socket.on('whatsapp_disconnected', () => {
      setSession({ status: 'DISCONNECTED', qrCode: undefined });
    });

    socket.on('notification', (notification: any) => {
      addNotification(notification);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [isAuthenticated, token]);

  const joinConversation = useCallback((conversationId: string) => {
    socket?.emit('join_conversation', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socket?.emit('leave_conversation', conversationId);
  }, []);

  const sendTyping = useCallback((conversationId: string) => {
    socket?.emit('typing', { conversationId });
  }, []);

  const onNewMessage = useCallback((handler: (data: any) => void) => {
    socket?.on('new_message', handler);
    return () => { socket?.off('new_message', handler); };
  }, []);

  const onUserTyping = useCallback((handler: (data: any) => void) => {
    socket?.on('user_typing', handler);
    return () => { socket?.off('user_typing', handler); };
  }, []);

  return { socket, joinConversation, leaveConversation, sendTyping, onNewMessage, onUserTyping };
};

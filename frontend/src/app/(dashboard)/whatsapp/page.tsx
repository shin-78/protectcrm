'use client';
import { useState, useEffect, useRef } from 'react';
import { whatsappApi } from '@/services/api';
import { useSocket } from '@/hooks/useSocket';
import { useWAStore } from '@/store';
import { formatRelative, cn } from '@/lib/utils';
import {
  Phone, Smartphone, QrCode, LogOut, Loader2, Search, MessageSquare,
  MoreVertical, Send, Paperclip, Image as ImageIcon, FileText, Check, CheckCheck
} from 'lucide-react';

export default function WhatsAppPage() {
  const { session, setSession } = useWAStore();
  const { onNewMessage, socket } = useSocket();
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [waitingQr, setWaitingQr] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    whatsappApi.getStatus()
      .then(({ data }) => setSession(data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  // Listen for QR code from Baileys via WebSocket
  useEffect(() => {
    if (!socket) return;
    const handleQr = ({ qrCode: qr }: { qrCode: string }) => {
      setQrCode(qr);
      setWaitingQr(false);
      setLoading(false);
      setSession({ status: 'QR_CODE', qrCode: qr });
    };
    const handleConnected = ({ phone }: any) => {
      setQrCode(null);
      setWaitingQr(false);
      setSession({ status: 'CONNECTED', phoneNumber: phone });
    };
    socket.on('whatsapp_qr', handleQr);
    socket.on('whatsapp_status', (data: any) => {
      if (data.status === 'connected') handleConnected(data);
    });
    return () => {
      socket.off('whatsapp_qr', handleQr);
      socket.off('whatsapp_status');
    };
  }, [socket]);

  useEffect(() => {
    if (session.status === 'CONNECTED') {
      whatsappApi.getConversations().then(({ data }) => setConversations(data.conversations));
    }
  }, [session.status]);

  useEffect(() => {
    if (activeConv) {
      whatsappApi.getMessages(activeConv.id).then(({ data }) => {
        setMessages(data.messages);
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
      });
    }
  }, [activeConv]);

  useEffect(() => {
    const unsub = onNewMessage(({ message, conversation }) => {
      setConversations(prev => {
        const exists = prev.find(c => c.id === conversation.id);
        if (exists) {
          return [conversation, ...prev.filter(c => c.id !== conversation.id)];
        }
        return [conversation, ...prev];
      });

      if (activeConv?.id === conversation.id) {
        setMessages(prev => [...prev, message]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    });
    return () => { unsub(); };
  }, [activeConv, onNewMessage]);

  const handleConnect = async () => {
    setLoading(true);
    setWaitingQr(true);
    setQrCode(null);
    try {
      await whatsappApi.connect();
      // QR code will arrive via socket event 'whatsapp_qr'
    } catch (e) {
      console.error('Connection failed');
      setWaitingQr(false);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    await whatsappApi.disconnect();
    setSession({ status: 'DISCONNECTED', qrCode: undefined });
    setConversations([]);
    setActiveConv(null);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConv || sending) return;

    setSending(true);
    try {
      const { data } = await whatsappApi.sendMessage({
        conversationId: activeConv.id,
        text: inputText,
        mediaType: 'TEXT'
      });
      setMessages(prev => [...prev, data]);
      setInputText('');
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      console.error('Send message failed');
    } finally {
      setSending(false);
    }
  };

  // Show spinner while waiting for QR
  if (loading || waitingQr) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{waitingQr ? 'Gerando QR Code...' : 'Carregando...'}</p>
      </div>
    );
  }

  // Connection Screens
  if (session.status === 'DISCONNECTED' || session.status === 'CONNECTING') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
          <Phone className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Conecte seu WhatsApp</h2>
        <p className="text-muted-foreground mb-8 max-w-md">
          Conecte seu número para atender leads e enviar mensagens diretamente pelo ProtectCRM.
        </p>
        <button
          onClick={handleConnect}
          disabled={session.status === 'CONNECTING'}
          className="gradient-primary text-white px-8 py-3 rounded-xl font-medium shadow-lg hover:opacity-90 flex items-center gap-2"
        >
          {session.status === 'CONNECTING' ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
          {session.status === 'CONNECTING' ? 'Iniciando...' : 'Gerar QR Code'}
        </button>
      </div>
    );
  }

  if (session.status === 'QR_CODE' && session.qrCode) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold mb-2">Escaneie o QR Code</h2>
        <p className="text-muted-foreground mb-8">
          Abra o WhatsApp no seu celular → <strong>Aparelhos Conectados</strong> → aponte a câmera.
        </p>
        <div className="p-4 bg-white rounded-2xl shadow-xl qr-pulse">
          {/* Baileys returns full data URL from QRCode.toDataURL() */}
          <img src={session.qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
        </div>
        <p className="mt-8 text-sm text-muted-foreground animate-pulse">Aguardando escaneamento...</p>
        <button
          onClick={() => setSession({ status: 'DISCONNECTED' })}
          className="mt-4 text-sm text-muted-foreground underline"
        >Cancelar</button>
      </div>
    );
  }

  // Connected Screen (Chat UI)
  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Sidebar - Conversations list */}
      <div className="w-80 border-r border-border flex flex-col bg-card/50">
        <div className="p-4 border-b border-border flex items-center justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-full overflow-hidden">
              {session.profilePicture ? (
                <img src={session.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Phone className="w-5 h-5" />
                </div>
              )}
            </div>
            <div>
              <h3 className="font-medium text-sm">{session.profileName || 'WhatsApp'}</h3>
              <p className="text-xs text-emerald-500 font-medium">Conectado</p>
            </div>
          </div>
          <button onClick={handleDisconnect} className="text-muted-foreground hover:text-red-500 p-2" title="Desconectar">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Pesquisar conversa..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm mt-10">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma conversa encontrada
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={cn(
                  "w-full p-3 flex items-start gap-3 border-b border-border transition-colors hover:bg-muted/50",
                  activeConv?.id === conv.id && "bg-primary/5"
                )}
              >
                <div className="w-12 h-12 bg-secondary rounded-full flex-shrink-0 flex items-center justify-center text-muted-foreground font-medium overflow-hidden">
                  {conv.remoteAvatar ? (
                    <img src={conv.remoteAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    conv.remoteName?.charAt(0).toUpperCase() || <Phone className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="font-medium text-sm truncate pr-2">{conv.remoteName || conv.remoteJid.split('@')[0]}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {conv.lastMessageAt ? formatRelative(conv.lastMessageAt).replace('há ', '') : ''}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground truncate">{conv.lastMessageText || 'Nova mensagem'}</span>
                    {conv.unreadCount > 0 && (
                      <span className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col bg-[url('https://cdn.whatsapp.net/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] bg-opacity-5 dark:bg-opacity-10 bg-repeat">
          {/* Chat Header */}
          <div className="h-16 border-b border-border bg-card/90 backdrop-blur-sm flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                {activeConv.remoteName?.charAt(0).toUpperCase() || <Phone className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div>
                <h3 className="font-medium text-sm">{activeConv.remoteName || activeConv.remoteJid.split('@')[0]}</h3>
                <p className="text-xs text-muted-foreground">{activeConv.remoteJid.split('@')[0]}</p>
              </div>
            </div>
            <button className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => {
              const isOut = msg.direction === 'OUTBOUND';
              return (
                <div key={msg.id || i} className={cn("flex flex-col max-w-md", isOut ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn("px-4 py-2 rounded-2xl text-sm shadow-sm", isOut ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border rounded-tl-sm")}>
                    {msg.type === 'IMAGE' && msg.mediaUrl && <img src={msg.mediaUrl} alt="Media" className="rounded-xl mb-2 max-w-[250px] object-cover" />}
                    <div>{msg.content}</div>
                    <div className={cn("text-[10px] mt-1 flex justify-end items-center gap-1 opacity-70", isOut ? "text-primary-foreground" : "text-muted-foreground")}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isOut && <CheckCheck className="w-3 h-3 ml-1" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-card border-t border-border">
            <form onSubmit={handleSendMessage} className="flex items-end gap-3 message-input bg-background border border-border p-2 pl-4 rounded-2xl transition-all shadow-sm">
              <button type="button" className="p-2 text-muted-foreground hover:text-primary transition-colors">
                <Paperclip className="w-5 h-5" />
              </button>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none focus:outline-none text-sm py-3"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="p-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm mb-0.5 mr-0.5"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 text-muted-foreground">
          <Smartphone className="w-16 h-16 mb-4 opacity-20" />
          <h2 className="text-xl font-medium text-foreground mb-2">WhatsApp Web</h2>
          <p className="text-sm text-center max-w-sm">Envie e receba mensagens sem manter seu celular conectado.<br />Selecione uma conversa para começar.</p>
        </div>
      )}
    </div>
  );
}

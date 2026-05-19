import axios from 'axios';
import logger from '../config/logger';

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    'apikey': process.env.EVOLUTION_API_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

export class EvolutionService {
  // Create a new WhatsApp instance
  static async createInstance(instanceName: string, webhookUrl: string) {
    try {
      const res = await evolutionApi.post('/instance/create', {
        instanceName,
        token: instanceName,
        qrcode: true,
        integration: 'WHATSAPP_BAILEYS',
        webhook: {
          url: webhookUrl,
          enabled: true,
          events: [
            'MESSAGES_UPSERT', 'MESSAGES_UPDATE', 'CONNECTION_UPDATE',
            'QRCODE_UPDATED', 'SEND_MESSAGE',
          ],
        },
        chatwoot: { enabled: false },
        settings: {
          rejectCall: false,
          msgCall: '',
          groupsIgnore: false,
          alwaysOnline: false,
          readMessages: false,
          readStatus: false,
          syncFullHistory: false,
        },
      });
      return res.data;
    } catch (error: any) {
      logger.error('Evolution createInstance error', { error: error.response?.data || error.message });
      throw error;
    }
  }

  // Get QR Code
  static async getQrCode(instanceName: string) {
    try {
      const res = await evolutionApi.get(`/instance/connect/${instanceName}`);
      return res.data;
    } catch (error: any) {
      logger.error('Evolution getQrCode error', { error: error.response?.data || error.message });
      throw error;
    }
  }

  // Get instance status
  static async getInstanceStatus(instanceName: string) {
    try {
      const res = await evolutionApi.get(`/instance/connectionState/${instanceName}`);
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 404) return { state: 'close' };
      throw error;
    }
  }

  // Send text message
  static async sendTextMessage(instanceName: string, to: string, text: string) {
    try {
      const res = await evolutionApi.post(`/message/sendText/${instanceName}`, {
        number: to,
        textMessage: { text },
        options: { delay: 1200, presence: 'composing' },
      });
      return res.data;
    } catch (error: any) {
      logger.error('Evolution sendText error', { error: error.response?.data || error.message });
      throw error;
    }
  }

  // Send media message
  static async sendMediaMessage(instanceName: string, to: string, media: {
    type: 'image' | 'video' | 'document' | 'audio';
    url: string;
    caption?: string;
    fileName?: string;
  }) {
    try {
      const res = await evolutionApi.post(`/message/sendMedia/${instanceName}`, {
        number: to,
        mediaMessage: {
          mediatype: media.type,
          media: media.url,
          caption: media.caption,
          fileName: media.fileName,
        },
        options: { delay: 1200 },
      });
      return res.data;
    } catch (error: any) {
      logger.error('Evolution sendMedia error', { error: error.response?.data || error.message });
      throw error;
    }
  }

  // Send audio message
  static async sendAudioMessage(instanceName: string, to: string, audioUrl: string) {
    try {
      const res = await evolutionApi.post(`/message/sendWhatsAppAudio/${instanceName}`, {
        number: to,
        audioMessage: { audio: audioUrl },
        options: { delay: 1200, encoding: true },
      });
      return res.data;
    } catch (error: any) {
      logger.error('Evolution sendAudio error', { error: error.response?.data || error.message });
      throw error;
    }
  }

  // Logout instance
  static async logoutInstance(instanceName: string) {
    try {
      await evolutionApi.delete(`/instance/logout/${instanceName}`);
    } catch (error: any) {
      logger.error('Evolution logout error', { error: error.response?.data || error.message });
    }
  }

  // Delete instance
  static async deleteInstance(instanceName: string) {
    try {
      await evolutionApi.delete(`/instance/delete/${instanceName}`);
    } catch (error: any) {
      logger.error('Evolution deleteInstance error', { error: error.response?.data || error.message });
    }
  }

  // Get all instances
  static async getAllInstances() {
    try {
      const res = await evolutionApi.get('/instance/fetchInstances');
      return res.data;
    } catch (error: any) {
      logger.error('Evolution getAllInstances error', { error: error.response?.data || error.message });
      return [];
    }
  }

  // Get chat history
  static async getChatHistory(instanceName: string, remoteJid: string, limit = 50) {
    try {
      const res = await evolutionApi.post(`/chat/findMessages/${instanceName}`, {
        where: { key: { remoteJid } },
        limit,
      });
      return res.data;
    } catch (error: any) {
      logger.error('Evolution getChatHistory error', { error: error.response?.data || error.message });
      return [];
    }
  }

  // Get contacts
  static async getContacts(instanceName: string) {
    try {
      const res = await evolutionApi.post(`/chat/findContacts/${instanceName}`, {});
      return res.data;
    } catch (error: any) {
      logger.error('Evolution getContacts error', { error: error.response?.data || error.message });
      return [];
    }
  }
}

export default EvolutionService;

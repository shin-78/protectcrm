import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('crm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
  getRanking: () => api.get('/dashboard/ranking'),
  getTasks: (params?: any) => api.get('/dashboard/tasks', { params }),
  createTask: (data: any) => api.post('/dashboard/tasks', data),
  updateTask: (id: string, data: any) => api.put(`/dashboard/tasks/${id}`, data),
  deleteTask: (id: string) => api.delete(`/dashboard/tasks/${id}`),
  getNotifications: () => api.get('/dashboard/notifications'),
  markNotificationsRead: () => api.put('/dashboard/notifications/read'),
};

// Leads
export const leadsApi = {
  getAll: (params?: any) => api.get('/leads', { params }),
  getStats: () => api.get('/leads/stats'),
  getById: (id: string) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  import: (leads: any[]) => api.post('/leads/import', { leads }),
  createNote: (data: any) => api.post('/leads/notes', data),
};

// Pipeline
export const pipelineApi = {
  getAll: () => api.get('/pipeline'),
  getWithLeads: (id: string) => api.get(`/pipeline/${id}`),
  create: (data: any) => api.post('/pipeline', data),
  update: (id: string, data: any) => api.put(`/pipeline/${id}`, data),
  moveLead: (data: any) => api.post('/pipeline/move', data),
  createStage: (pipelineId: string, data: any) => api.post(`/pipeline/${pipelineId}/stages`, data),
  updateStage: (pipelineId: string, stageId: string, data: any) => api.put(`/pipeline/${pipelineId}/stages/${stageId}`, data),
};

// WhatsApp
export const whatsappApi = {
  connect: () => api.post('/whatsapp/connect'),
  getStatus: () => api.get('/whatsapp/status'),
  disconnect: () => api.post('/whatsapp/disconnect'),
  getConversations: (params?: any) => api.get('/whatsapp/conversations', { params }),
  getMessages: (conversationId: string, params?: any) => api.get(`/whatsapp/conversations/${conversationId}/messages`, { params }),
  sendMessage: (data: any) => api.post('/whatsapp/send', data),
  linkConversation: (data: any) => api.post('/whatsapp/conversations/link', data),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users'),
  getStats: (params?: any) => api.get('/users/stats', { params }),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

export default api;

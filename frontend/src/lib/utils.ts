import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  const d = new Date(date);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatRelative(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatPhone(phone: string) {
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13) return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,9)}-${clean.slice(9)}`;
  if (clean.length === 11) return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
  return phone;
}

export function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'Novo Lead',
  IN_PROGRESS: 'Em Atendimento',
  PROPOSAL: 'Proposta',
  NEGOTIATION: 'Negociação',
  CLOSED: 'Fechado',
  LOST: 'Perdido',
};

export const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  PROPOSAL: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  NEGOTIATION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  CLOSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  LOST: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export const ROLE_LABELS: Record<string, string> = {
  MASTER: 'Master',
  SUPERVISOR: 'Supervisor',
  OPERATOR: 'Operador',
};

export const ROLE_COLORS: Record<string, string> = {
  MASTER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  SUPERVISOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  OPERATOR: 'bg-gray-100 text-gray-700 dark:bg-gray-800/60 dark:text-gray-300',
};

export function truncate(str: string, max = 40) {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

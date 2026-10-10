import api from './client';
import type { GoalOutcome } from '@connecta-focus/shared';

export const getHistory = async (range: 'today' | 'week') => {
  const res = await api.get('/sessions/history', { params: { range } });
  return res.data;
};

export const submitReflection = async (sessionId: string, data: { outcome: GoalOutcome; obstacles?: string; nextSteps?: string }) => {
  const res = await api.post(`/sessions/${sessionId}/reflection`, data);
  return res.data;
};
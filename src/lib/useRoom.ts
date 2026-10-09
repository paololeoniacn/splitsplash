import { useQuery } from '@tanstack/react-query';
import { api } from './api';

export const roomKey = (roomId: string) => ['room', roomId] as const;
export const expensesKey = (roomId: string) => ['expenses', roomId] as const;
export const activityKey = (roomId: string) => ['activity', roomId] as const;

export function useRoom(roomId: string) {
  return useQuery({ queryKey: roomKey(roomId), queryFn: () => api.room(roomId), refetchInterval: 20_000 });
}

export function useExpenses(roomId: string) {
  return useQuery({ queryKey: expensesKey(roomId), queryFn: () => api.expenses(roomId).then((r) => r.expenses), refetchInterval: 15_000 });
}

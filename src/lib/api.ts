import type { ExpenseInput } from '../../shared/schemas';
import type { Activity, Expense, Member, RoomState } from '../../shared/types';
import { forgetRoom, tokenFor } from './storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

async function request<T>(path: string, init: RequestInit & { roomId?: string } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  if (init.roomId) {
    const token = tokenFor(init.roomId);
    if (!token) throw new ApiError(401, 'unauthorized');
    headers.set('authorization', `Bearer ${token}`);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'offline');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && init.roomId) forgetRoom(init.roomId);
    throw new ApiError(res.status, (data as { error?: string }).error ?? 'server_error');
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export interface LookupResult {
  room: { id: string; name: string; currency: string };
  members: Member[];
}

export const api = {
  createRoom: (body: { name: string; currency: string; member: { name: string; animal: string } }) =>
    request<{ roomId: string; token: string; passphrase: string }>('/rooms', { method: 'POST', body: json(body) }),
  lookup: (passphrase: string) => request<LookupResult>('/join/lookup', { method: 'POST', body: json({ passphrase }) }),
  join: (body: { passphrase: string; memberId: string } | { passphrase: string; member: { name: string; animal: string } }) =>
    request<{ roomId: string; token: string }>('/join', { method: 'POST', body: json(body) }),

  room: (roomId: string) => request<RoomState>('/room', { roomId }),
  rotatePassphrase: (roomId: string, signOutOthers: boolean) =>
    request<{ passphrase: string }>('/room/passphrase', { method: 'POST', body: json({ signOutOthers }), roomId }),
  addMember: (roomId: string, body: { name: string; animal: string }) => request<{ id: string }>('/room/members', { method: 'POST', body: json(body), roomId }),
  updateMe: (roomId: string, body: { name: string; animal: string }) => request('/room/me', { method: 'PATCH', body: json(body), roomId }),
  leave: (roomId: string) => request('/room/leave', { method: 'POST', roomId }),

  expenses: (roomId: string) => request<{ expenses: Expense[] }>('/room/expenses', { roomId }),
  createExpense: (roomId: string, body: ExpenseInput) => request<{ id: string }>('/room/expenses', { method: 'POST', body: json(body), roomId }),
  updateExpense: (roomId: string, id: string, body: ExpenseInput) => request(`/room/expenses/${id}`, { method: 'PUT', body: json(body), roomId }),
  deleteExpense: (roomId: string, id: string) => request(`/room/expenses/${id}`, { method: 'DELETE', roomId }),
  restoreExpense: (roomId: string, id: string) => request(`/room/expenses/${id}/restore`, { method: 'POST', roomId }),

  activity: (roomId: string, before?: number) =>
    request<{ activity: Activity[]; hasMore: boolean }>(`/room/activity${before ? `?before=${before}` : ''}`, { roomId }),
};

import type { ExpenseInput } from '../../shared/schemas';
import type { Activity, Expense, Member, RoomState } from '../../shared/types';
import { forgetRoom, forgetVault, tokenFor, vaultToken } from './storage';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

async function request<T>(path: string, init: RequestInit & { roomId?: string; vault?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('content-type', 'application/json');
  if (init.roomId) {
    const token = tokenFor(init.roomId);
    if (!token) throw new ApiError(401, 'unauthorized');
    headers.set('authorization', `Bearer ${token}`);
  }
  if (init.vault) {
    const token = vaultToken();
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
    if (res.status === 401 && init.vault) forgetVault();
    throw new ApiError(res.status, (data as { error?: string }).error ?? 'server_error');
  }
  return data as T;
}

const json = (body: unknown) => JSON.stringify(body);

export interface LookupResult {
  room: { id: string; name: string; currency: string };
  members: Member[];
}

export interface VaultOpened {
  vaultToken: string;
  rooms: { roomId: string; name: string; token: string }[];
}

export interface VaultInfo {
  rooms: { roomId: string; roomName: string; member: { name: string; animal: string; ink: number } }[];
  passkeys: number;
  createdAt: number;
}

type PasskeyOptions<O> = { challengeId: string; options: O };

export const api = {
  createRoom: (body: { name: string; currency: string; member: { name: string; animal: string } }) =>
    request<{ roomId: string; token: string; passphrase: string }>('/rooms', { method: 'POST', body: json(body) }),
  lookup: (passphrase: string) => request<LookupResult>('/join/lookup', { method: 'POST', body: json({ passphrase }) }),
  join: (body: { passphrase: string; memberId: string } | { passphrase: string; member: { name: string; animal: string } }) =>
    request<{ roomId: string; token: string }>('/join', { method: 'POST', body: json(body) }),

  room: (roomId: string) => request<RoomState>('/room', { roomId }),
  settleAll: (roomId: string, body: { title: string; date: string; transfers: { from: string; to: string; amount: number }[] }) =>
    request<{ count: number; amount: number }>('/room/settle-all', { method: 'POST', body: json(body), roomId }),
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

  vaultCreate: (tokens: string[]) => request<{ vaultToken: string; recoveryCode: string }>('/vault', { method: 'POST', body: json({ tokens }) }),
  vaultRecover: (code: string) => request<VaultOpened>('/vault/recover', { method: 'POST', body: json({ code }) }),
  vaultLoginOptions: <O>() => request<PasskeyOptions<O>>('/vault/passkey/login/options', { method: 'POST' }),
  vaultLogin: (challengeId: string, response: unknown) =>
    request<VaultOpened>('/vault/passkey/login', { method: 'POST', body: json({ challengeId, response }) }),
  vault: () => request<VaultInfo>('/vault', { vault: true }),
  vaultLink: (tokens: string[]) => request('/vault/rooms', { method: 'POST', body: json({ tokens }), vault: true }),
  vaultUnlink: (roomId: string) => request(`/vault/rooms/${encodeURIComponent(roomId)}`, { method: 'DELETE', vault: true }),
  vaultRegisterOptions: <O>() => request<PasskeyOptions<O>>('/vault/passkey/register/options', { method: 'POST', vault: true }),
  vaultRegister: (challengeId: string, response: unknown) =>
    request('/vault/passkey/register', { method: 'POST', body: json({ challengeId, response }), vault: true }),
  vaultNewCode: () => request<{ recoveryCode: string }>('/vault/recovery-code', { method: 'POST', vault: true }),
  vaultSignOut: () => request('/vault/signout', { method: 'POST', vault: true }),
  vaultDelete: () => request('/vault', { method: 'DELETE', vault: true }),
};

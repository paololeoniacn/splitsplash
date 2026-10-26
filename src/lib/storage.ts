export interface SavedRoom {
  roomId: string;
  token: string;
  name: string;
  savedAt: number;
}

const KEY = 'splitsplash.rooms.v1';

export function savedRooms(): SavedRoom[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as SavedRoom[];
    return Array.isArray(list) ? list.sort((a, b) => b.savedAt - a.savedAt) : [];
  } catch {
    return [];
  }
}

export function saveRoom(room: Omit<SavedRoom, 'savedAt'>) {
  const rest = savedRooms().filter((r) => r.roomId !== room.roomId);
  localStorage.setItem(KEY, JSON.stringify([{ ...room, savedAt: Date.now() }, ...rest]));
}

export function touchRoom(roomId: string, name: string) {
  const r = savedRooms().find((x) => x.roomId === roomId);
  if (r && (r.name !== name || Date.now() - r.savedAt > 60_000)) saveRoom({ ...r, name });
}

export function forgetRoom(roomId: string) {
  localStorage.setItem(KEY, JSON.stringify(savedRooms().filter((r) => r.roomId !== roomId)));
}

export const tokenFor = (roomId: string) => savedRooms().find((r) => r.roomId === roomId)?.token;

const VAULT_KEY = 'splitsplash.vault.v1';

export const vaultToken = (): string | null => localStorage.getItem(VAULT_KEY);
export const setVaultToken = (token: string) => localStorage.setItem(VAULT_KEY, token);
export const forgetVault = () => localStorage.removeItem(VAULT_KEY);

import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { api, ApiError, type VaultOpened } from './api';
import { saveRoom, savedRooms, setVaultToken, vaultToken } from './storage';

export const passkeySupported = () => typeof window !== 'undefined' && 'PublicKeyCredential' in window;

/** Browser-side WebAuthn failures, mapped onto the same error codes the API uses. */
function passkeyError(e: unknown): never {
  if (e instanceof ApiError) throw e;
  const name = (e as { name?: string; cause?: { name?: string } })?.cause?.name ?? (e as { name?: string })?.name;
  if (name === 'InvalidStateError') throw new ApiError(0, 'passkey_exists');
  if (name === 'NotAllowedError' || name === 'AbortError') throw new ApiError(0, 'passkey_cancelled');
  throw new ApiError(0, 'passkey_invalid');
}

/** Puts the rooms the keyring returned on this device (keeping ones already here). */
function store(rooms: VaultOpened['rooms']) {
  const local = new Set(savedRooms().map((r) => r.roomId));
  for (const r of rooms) if (!local.has(r.roomId)) saveRoom(r);
  return rooms.length;
}

const restore = (opened: VaultOpened) => (setVaultToken(opened.vaultToken), store(opened.rooms));

/** Adds the given rooms on this device to the active keyring. Never automatic: unlinked rooms stay unlinked. */
export async function linkRooms(roomIds: string[]) {
  const wanted = new Set(roomIds);
  const tokens = savedRooms()
    .filter((r) => wanted.has(r.roomId))
    .map((r) => r.token);
  if (vaultToken() && tokens.length) await api.vaultLink(tokens.slice(0, 100));
}

/** Brings linked rooms that are missing here back onto this device. */
export async function restoreMissing(roomIds: string[]) {
  return store((await api.vaultOpen(roomIds)).rooms);
}

/** Fire-and-forget when leaving a room on this device, so the keyring doesn't bring it back. */
export function unlinkFromVault(roomId: string) {
  if (vaultToken()) return api.vaultUnlink(roomId).catch(() => {});
}

/** Starts over with a new recovery code, signing out every other device that entered through the keyring. */
export const newRecoveryCode = () =>
  api.vaultNewCode(
    savedRooms()
      .map((r) => r.token)
      .slice(0, 100),
  );

/** Fire-and-forget after creating or joining a room. */
export function linkToVault(token: string) {
  if (vaultToken()) api.vaultLink([token]).catch(() => {});
}

export async function createVault() {
  const res = await api.vaultCreate(
    savedRooms()
      .map((r) => r.token)
      .slice(0, 100),
  );
  setVaultToken(res.vaultToken);
  return res.recoveryCode;
}

export async function addPasskey() {
  const { startRegistration } = await import('@simplewebauthn/browser');
  const { challengeId, options } = await api.vaultRegisterOptions<PublicKeyCredentialCreationOptionsJSON>();
  const response = await startRegistration({ optionsJSON: options }).catch(passkeyError);
  await api.vaultRegister(challengeId, response);
}

export async function openWithPasskey() {
  const { startAuthentication } = await import('@simplewebauthn/browser');
  const { challengeId, options } = await api.vaultLoginOptions<PublicKeyCredentialRequestOptionsJSON>();
  const response = await startAuthentication({ optionsJSON: options }).catch(passkeyError);
  return restore(await api.vaultLogin(challengeId, response));
}

export async function openWithCode(code: string) {
  return restore(await api.vaultRecover(code));
}

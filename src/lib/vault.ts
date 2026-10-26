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

/** Puts every room the keyring returned on this device and remembers the keyring. */
async function restore(opened: VaultOpened) {
  setVaultToken(opened.vaultToken);
  const local = new Set(savedRooms().map((r) => r.roomId));
  for (const r of opened.rooms) if (!local.has(r.roomId)) saveRoom(r);
  await syncLocalRooms();
  return opened.rooms.length;
}

/** Links every room on this device to the active keyring. */
export async function syncLocalRooms() {
  const tokens = savedRooms().map((r) => r.token);
  if (vaultToken() && tokens.length) await api.vaultLink(tokens.slice(0, 100));
}

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

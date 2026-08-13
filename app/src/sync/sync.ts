import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { dirtyRows, markClean, upsert, getMeta, setMeta, markAllDirty } from '../db/sqlite';

const API = process.env.EXPO_PUBLIC_API_URL ?? '';
const COLLECTIONS = ['accounts', 'categories', 'transactions', 'debts', 'assets', 'settings'] as const;

export type SyncResult = 'ok' | 'offline' | 'signedout' | 'expired' | 'error' | 'busy' | 'noapi';

let inFlight = false;
let pending = false;
let started = false;
let onPulled: (() => void) | null = null;
let onSignedOut: (() => void) | null = null;
let onSynced: ((ts: number) => void) | null = null;
let onStatus: ((message: string) => void) | null = null;
let errorNotified = false; // one failure toast per streak, not one per retry

export const hasApi = () => !!API;

/** Call once at app start: registers connectivity + foreground listeners and the pull callback. */
export function startSync(callbacks: { onPulled: () => void; onSignedOut: () => void; onSynced: (ts: number) => void; onStatus: (message: string) => void }) {
  onPulled = callbacks.onPulled;
  onSignedOut = callbacks.onSignedOut;
  onSynced = callbacks.onSynced;
  onStatus = callbacks.onStatus;
  if (started || !API) return;
  started = true;
  NetInfo.addEventListener(state => { if (state.isConnected) requestSync(); });
  AppState.addEventListener('change', s => { if (s === 'active') requestSync(); });
}

/** Register or log in; on success stores the token and uploads the full local dataset. Returns an error message or null. */
export async function signIn(mode: 'register' | 'login', email: string, password: string): Promise<string | null> {
  if (!API) return 'Sync server is not configured (EXPO_PUBLIC_API_URL)';
  try {
    const res = await fetch(`${API}/auth/${mode}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json().catch(() => ({} as Record<string, string>));
    if (!res.ok) return data.error ?? 'Could not sign in';
    setMeta('authToken', data.token);
    setMeta('syncEmail', email.trim());
    setMeta('lastPulledAt', '0');
    markAllDirty(); // first sync pushes everything local, then pulls whatever the account already has
    requestSync();
    return null;
  } catch {
    return 'Could not reach the sync server';
  }
}

export function signOut() {
  setMeta('authToken', '');
  setMeta('syncEmail', '');
  setMeta('lastPulledAt', '0'); // a future login re-pulls the full account state
}

/**
 * Fire-and-forget: call after any local write. No-op when offline, unconfigured, or signed out.
 * Debounced: rapid writes (typing a name, dragging categories) collapse into one
 * sync that fires after the burst goes quiet, instead of one request per keystroke.
 */
const SYNC_DEBOUNCE_MS = 1500;
let syncTimer: ReturnType<typeof setTimeout> | undefined;
export function requestSync() {
  if (!API) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    if (inFlight) { pending = true; return; }
    void run();
  }, SYNC_DEBOUNCE_MS);
}

/** Explicit user-triggered sync ("Sync now") — resolves with the outcome so the UI can report it. */
export async function syncNow(): Promise<SyncResult> {
  if (!API) return 'noapi';
  if (inFlight) return 'busy';
  return run(false); // the caller shows the result; no engine toast on top
}

async function run(notify = true): Promise<SyncResult> {
  inFlight = true;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return 'offline';
    const token = getMeta('authToken');
    if (!token) return 'signedout'; // fully usable without an account
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // push
    const body: Record<string, unknown> = {};
    const pushed: Record<string, string[]> = {};
    let pushedCount = 0;
    for (const c of COLLECTIONS) {
      const rows = dirtyRows(c);
      if (rows.length) { body[c] = rows; pushed[c] = rows.map(r => r.id); pushedCount += rows.length; }
    }
    if (pushedCount > 0) {
      const res = await fetch(`${API}/sync`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.status === 401) return handleExpired(notify);
      if (!res.ok) return fail(notify);
      for (const c of COLLECTIONS) if (pushed[c]) markClean(c, pushed[c]);
    }

    // pull (last-write-wins by updatedAt; local dirty rows win until pushed)
    const since = getMeta('lastPulledAt') ?? '0';
    const res = await fetch(`${API}/sync?since=${since}`, { headers });
    if (res.status === 401) return handleExpired(notify);
    if (!res.ok) return fail(notify);
    const data = await res.json();
    let applied = 0;
    for (const c of COLLECTIONS) {
      for (const row of data[c] ?? []) {
        upsert(c, row.id, row.data, { clean: true, updatedAt: row.updatedAt, deleted: row.deleted });
        applied++;
      }
    }
    setMeta('lastPulledAt', String(data.serverTime ?? Date.now()));
    if (applied > 0) onPulled?.(); // re-hydrate the store from SQLite

    const ts = Date.now();
    setMeta('lastSyncAt', String(ts));
    onSynced?.(ts);
    errorNotified = false;
    // Only announce syncs that moved data — silent for routine no-op checks.
    if (notify && (pushedCount > 0 || applied > 0)) onStatus?.('Synced — backed up to cloud ✓');
    return 'ok';
  } catch {
    // offline-first: reconnect/foreground/next write retries automatically
    return fail(notify);
  } finally {
    inFlight = false;
    if (pending) { pending = false; requestSync(); }
  }
}

function fail(notify: boolean): SyncResult {
  if (notify && !errorNotified) {
    errorNotified = true;
    onStatus?.("Couldn't back up — changes saved on phone, retrying automatically");
  }
  return 'error';
}

function handleExpired(notify: boolean): SyncResult {
  signOut();
  onSignedOut?.();
  if (notify) onStatus?.('Session expired — sign in again to keep syncing');
  return 'expired';
}

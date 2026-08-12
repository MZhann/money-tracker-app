import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { dirtyRows, markClean, upsert, getMeta, setMeta, markAllDirty } from '../db/sqlite';

const API = process.env.EXPO_PUBLIC_API_URL ?? '';
const COLLECTIONS = ['accounts', 'categories', 'transactions', 'debts', 'assets', 'settings'] as const;

let inFlight = false;
let pending = false;
let started = false;
let onPulled: (() => void) | null = null;
let onSignedOut: (() => void) | null = null;

export const hasApi = () => !!API;

/** Call once at app start: registers connectivity + foreground listeners and the pull callback. */
export function startSync(callbacks: { onPulled: () => void; onSignedOut: () => void }) {
  onPulled = callbacks.onPulled;
  onSignedOut = callbacks.onSignedOut;
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

/** Fire-and-forget: call after any local write. No-op when offline, unconfigured, or signed out. */
export function requestSync() {
  if (!API) return;
  if (inFlight) { pending = true; return; }
  void run();
}

async function run() {
  inFlight = true;
  try {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;
    const token = getMeta('authToken');
    if (!token) return; // fully usable without an account
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    // push
    const body: Record<string, unknown> = {};
    const pushed: Record<string, string[]> = {};
    let hasDirty = false;
    for (const c of COLLECTIONS) {
      const rows = dirtyRows(c);
      if (rows.length) { body[c] = rows; pushed[c] = rows.map(r => r.id); hasDirty = true; }
    }
    if (hasDirty) {
      const res = await fetch(`${API}/sync`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (res.status === 401) return handleExpired();
      if (res.ok) for (const c of COLLECTIONS) if (pushed[c]) markClean(c, pushed[c]);
    }

    // pull (last-write-wins by updatedAt; local dirty rows win until pushed)
    const since = getMeta('lastPulledAt') ?? '0';
    const res = await fetch(`${API}/sync?since=${since}`, { headers });
    if (res.status === 401) return handleExpired();
    if (res.ok) {
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
    }
  } catch {
    // stay silent — offline-first; reconnect/foreground/next write retries
  } finally {
    inFlight = false;
    if (pending) { pending = false; requestSync(); }
  }
}

function handleExpired() {
  signOut();
  onSignedOut?.();
}

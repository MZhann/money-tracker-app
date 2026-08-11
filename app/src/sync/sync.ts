import NetInfo from '@react-native-community/netinfo';
import { dirtyRows, markClean, upsert, getMeta, setMeta } from '../db/sqlite';

const API = process.env.EXPO_PUBLIC_API_URL ?? '';
const COLLECTIONS = ['accounts', 'categories', 'transactions', 'debts', 'settings'] as const;

let inFlight = false;
let pending = false;

/** Fire-and-forget: call after any local write. No-op when offline or unconfigured. */
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
    if (!token) return; // auth screen sets this; app is fully usable without an account
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
      if (res.ok) for (const c of COLLECTIONS) if (pushed[c]) markClean(c, pushed[c]);
    }

    // pull (last-write-wins by updatedAt; local dirty rows win until pushed)
    const since = getMeta('lastPulledAt') ?? '0';
    const res = await fetch(`${API}/sync?since=${since}`, { headers });
    if (res.ok) {
      const data = await res.json();
      for (const c of COLLECTIONS) {
        for (const row of data[c] ?? []) {
          upsert(c, row.id, row.data, { clean: true, updatedAt: row.updatedAt, deleted: row.deleted });
        }
      }
      setMeta('lastPulledAt', String(data.serverTime ?? Date.now()));
      // NOTE: after a pull that changed rows, the store should re-hydrate
      // (useFlow.getState().init()) — wire this to your needs; balances are
      // recomputed locally, never trusted from the wire blindly.
    }
  } catch {
    // stay silent — offline-first; next write or foreground retries
  } finally {
    inFlight = false;
    if (pending) { pending = false; requestSync(); }
  }
}

// re-sync when connectivity comes back
NetInfo.addEventListener(state => { if (state.isConnected) requestSync(); });

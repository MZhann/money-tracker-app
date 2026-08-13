import { create } from 'zustand';
import { Account, Asset, Category, Currency, Debt, Settings, Tx, monthKey, toKZT, uuid } from '../lib/money';
import { initDb, loadAll, softDelete, upsert, getMeta, setMeta, wipeAll } from '../db/sqlite';
import { defaultCategories, defaultSettings } from '../data/seed';
import { requestSync, signIn, signOut, startSync } from '../sync/sync';

interface FlowState {
  ready: boolean;
  settings: Settings;
  accounts: Account[];
  categories: Category[];
  transactions: Tx[];
  debts: Debt[];
  assets: Asset[];
  toast: string;
  syncEmail: string | null;
  lastSyncAt: number | null;
  init: () => void;
  showToast: (m: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  addTx: (tx: Omit<Tx, 'id'>) => void;
  updateTx: (tx: Tx) => void;
  deleteTx: (id: string) => void;
  saveAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;
  reorderAccounts: (from: number, to: number) => void;
  addCategory: (c: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (kind: 'expense' | 'income', from: number, to: number) => void;
  addDebt: (d: Omit<Debt, 'id'>) => void;
  settleDebt: (id: string) => void;
  saveAsset: (a: Asset) => void;
  deleteAsset: (id: string) => void;
  eraseAll: () => void;
  signIn: (mode: 'register' | 'login', email: string, password: string) => Promise<string | null>;
  signOut: () => void;
}

let toastTimer: ReturnType<typeof setTimeout>;

function applyBalance(accounts: Account[], accId: string, cur: Currency, delta: number): Account[] {
  return accounts.map(a => a.id === accId
    ? { ...a, balances: { ...a.balances, [cur]: Math.round((((a.balances[cur] ?? 0) + delta)) * 100) / 100 } }
    : a);
}

export const useFlow = create<FlowState>((set, get) => ({
  ready: false,
  settings: defaultSettings,
  accounts: [], categories: [], transactions: [], debts: [], assets: [],
  toast: '',
  syncEmail: null,
  lastSyncAt: null,

  init: () => {
    initDb();
    // 'seeded' = '1' was the old sample-data seed — wipe it so those installs start clean too.
    if (getMeta('seeded') !== '2') {
      wipeAll();
      upsert('settings', 'settings', defaultSettings, { clean: true });
      for (const c of defaultCategories) upsert('categories', c.id, c, { clean: true });
      setMeta('seeded', '2');
    }
    set({
      ready: true,
      settings: loadAll<Settings>('settings')[0] ?? defaultSettings,
      accounts: loadAll<Account>('accounts').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      categories: loadAll<Category>('categories').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
      transactions: loadAll<Tx>('transactions'),
      debts: loadAll<Debt>('debts'),
      assets: loadAll<Asset>('assets'),
      syncEmail: getMeta('syncEmail') || null,
      lastSyncAt: Number(getMeta('lastSyncAt')) || null,
    });
    startSync({
      onPulled: () => get().init(), // pulled rows land in SQLite; reload state from it
      onSignedOut: () => set({ syncEmail: null }),
      onSynced: ts => set({ lastSyncAt: ts }),
      onStatus: m => get().showToast(m),
    });
    requestSync();
  },

  showToast: (m) => {
    clearTimeout(toastTimer);
    set({ toast: m });
    toastTimer = setTimeout(() => set({ toast: '' }), 2200);
  },

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    upsert('settings', 'settings', settings);
    set({ settings });
    // No requestSync: preference tweaks (shown-count, theme, name…) apply locally for
    // the session; the dirty row uploads on the next app-open/foreground/reconnect sync.
  },

  addTx: (input) => {
    const tx: Tx = { ...input, id: uuid() };
    let accounts = get().accounts;
    if (tx.type === 'expense') accounts = applyBalance(accounts, tx.accountId, tx.currency, -tx.amount);
    if (tx.type === 'income') accounts = applyBalance(accounts, tx.accountId, tx.currency, tx.amount);
    if (tx.type === 'transfer' && tx.toId) {
      accounts = applyBalance(accounts, tx.accountId, tx.currency, -tx.amount);
      accounts = applyBalance(accounts, tx.toId, tx.currency, tx.amount);
    }
    upsert('transactions', tx.id, tx);
    for (const a of accounts) upsert('accounts', a.id, a);
    set({ transactions: [...get().transactions, tx], accounts });
    requestSync();
  },

  updateTx: (tx) => {
    const prev = get().transactions.find(x => x.id === tx.id);
    if (!prev) return;
    let accounts = get().accounts;
    // Undo the old transaction's balance effect, then apply the edited one.
    if (prev.type === 'expense') accounts = applyBalance(accounts, prev.accountId, prev.currency, prev.amount);
    if (prev.type === 'income') accounts = applyBalance(accounts, prev.accountId, prev.currency, -prev.amount);
    if (prev.type === 'transfer' && prev.toId) {
      accounts = applyBalance(accounts, prev.accountId, prev.currency, prev.amount);
      accounts = applyBalance(accounts, prev.toId, prev.currency, -prev.amount);
    }
    if (tx.type === 'expense') accounts = applyBalance(accounts, tx.accountId, tx.currency, -tx.amount);
    if (tx.type === 'income') accounts = applyBalance(accounts, tx.accountId, tx.currency, tx.amount);
    if (tx.type === 'transfer' && tx.toId) {
      accounts = applyBalance(accounts, tx.accountId, tx.currency, -tx.amount);
      accounts = applyBalance(accounts, tx.toId, tx.currency, tx.amount);
    }
    upsert('transactions', tx.id, tx);
    for (const a of accounts) upsert('accounts', a.id, a);
    set({ transactions: get().transactions.map(x => x.id === tx.id ? tx : x), accounts });
    requestSync();
  },

  deleteTx: (id) => {
    const tx = get().transactions.find(t => t.id === id);
    if (!tx) return;
    let accounts = get().accounts;
    if (tx.type === 'expense') accounts = applyBalance(accounts, tx.accountId, tx.currency, tx.amount);
    if (tx.type === 'income') accounts = applyBalance(accounts, tx.accountId, tx.currency, -tx.amount);
    if (tx.type === 'transfer' && tx.toId) {
      accounts = applyBalance(accounts, tx.accountId, tx.currency, tx.amount);
      accounts = applyBalance(accounts, tx.toId, tx.currency, -tx.amount);
    }
    softDelete('transactions', id);
    for (const a of accounts) upsert('accounts', a.id, a);
    set({ transactions: get().transactions.filter(t => t.id !== id), accounts });
    requestSync();
  },

  saveAccount: (acc) => {
    const prev = get().accounts;
    const exists = prev.some(a => a.id === acc.id);
    const withOrder = { ...acc, order: acc.order ?? (exists ? prev.find(a => a.id === acc.id)?.order : prev.length) ?? prev.length };
    upsert('accounts', withOrder.id, withOrder);
    set({ accounts: exists ? prev.map(a => a.id === withOrder.id ? withOrder : a) : [...prev, withOrder] });
    requestSync();
  },

  deleteAccount: (id) => {
    softDelete('accounts', id);
    set({ accounts: get().accounts.filter(a => a.id !== id) });
    requestSync();
  },

  reorderAccounts: (from, to) => {
    const list = [...get().accounts];
    if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    const reindexed = list.map((a, idx) => ({ ...a, order: idx }));
    for (const a of reindexed) upsert('accounts', a.id, a);
    set({ accounts: reindexed });
    // No requestSync: rows are dirty in SQLite; the app-open/foreground sync uploads
    // the new order in the background instead of racing an in-progress drag session.
  },

  addCategory: (c) => {
    const cat: Category = { ...c, id: uuid(), order: get().categories.length };
    upsert('categories', cat.id, cat);
    set({ categories: [...get().categories, cat] });
    requestSync();
  },

  // from/to are indices within the kind-filtered list (what the picker shows);
  // items of the other kind keep their global slots.
  reorderCategories: (kind, from, to) => {
    const list = [...get().categories];
    const idxs = list.map((c, i) => (c.kind === kind ? i : -1)).filter(i => i >= 0);
    if (from < 0 || from >= idxs.length || to < 0 || to >= idxs.length || from === to) return;
    const sub = idxs.map(i => list[i]);
    const [moved] = sub.splice(from, 1);
    sub.splice(to, 0, moved);
    idxs.forEach((gi, k) => { list[gi] = sub[k]; });
    const reindexed = list.map((c, idx) => ({ ...c, order: idx }));
    for (const c of reindexed) upsert('categories', c.id, c);
    set({ categories: reindexed });
    // No requestSync: rows are dirty in SQLite; the app-open/foreground sync uploads
    // the new order in the background instead of racing an in-progress drag session.
  },

  deleteCategory: (id) => {
    softDelete('categories', id);
    set({ categories: get().categories.filter(c => c.id !== id) });
    requestSync();
  },

  addDebt: (d) => {
    const debt: Debt = { ...d, id: uuid() };
    upsert('debts', debt.id, debt);
    set({ debts: [...get().debts, debt] });
    requestSync();
  },

  settleDebt: (id) => {
    softDelete('debts', id);
    set({ debts: get().debts.filter(d => d.id !== id) });
    requestSync();
  },

  saveAsset: (asset) => {
    const exists = get().assets.some(a => a.id === asset.id);
    upsert('assets', asset.id, asset);
    set({ assets: exists ? get().assets.map(a => a.id === asset.id ? asset : a) : [...get().assets, asset] });
    requestSync();
  },

  deleteAsset: (id) => {
    softDelete('assets', id);
    set({ assets: get().assets.filter(a => a.id !== id) });
    requestSync();
  },

  signIn: async (mode, email, password) => {
    const err = await signIn(mode, email, password);
    if (!err) set({ syncEmail: email.trim() });
    return err;
  },

  signOut: () => {
    signOut();
    set({ syncEmail: null });
  },

  eraseAll: () => {
    for (const t of get().transactions) softDelete('transactions', t.id);
    for (const a of get().accounts) softDelete('accounts', a.id);
    for (const d of get().debts) softDelete('debts', d.id);
    for (const a of get().assets) softDelete('assets', a.id);
    for (const c of get().categories) softDelete('categories', c.id);
    for (const c of defaultCategories) upsert('categories', c.id, c);
    set({ accounts: [], categories: defaultCategories, transactions: [], debts: [], assets: [] });
    requestSync();
  },
}));

// ---- derived selectors (pure) ----
export function netWorthKZT(accounts: Account[], debts: Debt[], property: Asset[] = []) {
  let cash = 0, credit = 0, lent = 0, borrowed = 0, prop = 0;
  for (const a of accounts) for (const [c, v] of Object.entries(a.balances)) {
    const k = toKZT(v as number, c as Currency);
    if (k >= 0) cash += k; else credit += -k;
  }
  for (const d of debts) {
    const k = toKZT(d.amount, d.currency);
    if (d.dir === 'lent') lent += k; else borrowed += k;
  }
  for (const p of property) prop += toKZT(p.value, p.currency);
  const liab = credit + borrowed;
  const assets = cash + lent + prop;
  return { assets, prop, liab, net: assets - liab, cash, credit, lent, borrowed };
}

export function monthFlowKZT(transactions: Tx[], key: string) {
  let inn = 0, out = 0;
  for (const t of transactions) {
    if (monthKey(t.date) !== key) continue;
    const v = toKZT(t.amount, t.currency);
    if (t.type === 'income') inn += v; else if (t.type === 'expense') out += v;
  }
  return { inn, out };
}

/** Net money flow through one account for a month (income + transfers-in − expense − transfers-out), in KZT. */
export function accountMonthFlowKZT(transactions: Tx[], accountId: string, key: string) {
  let net = 0;
  for (const tx of transactions) {
    if (monthKey(tx.date) !== key) continue;
    const v = toKZT(tx.amount, tx.currency);
    if (tx.type === 'income' && tx.accountId === accountId) net += v;
    else if (tx.type === 'expense' && tx.accountId === accountId) net -= v;
    else if (tx.type === 'transfer') {
      if (tx.accountId === accountId) net -= v;
      if (tx.toId === accountId) net += v;
    }
  }
  return net;
}

export function categoryTotalsKZT(transactions: Tx[], key: string, kind: 'expense' | 'income') {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== kind || monthKey(t.date) !== key) continue;
    const id = t.categoryId ?? 'other';
    totals[id] = (totals[id] ?? 0) + toKZT(t.amount, t.currency);
  }
  return totals;
}

import { create } from 'zustand';
import { Account, Category, Currency, Debt, Settings, Tx, monthKey, toKZT, uuid } from '../lib/money';
import { initDb, loadAll, softDelete, upsert, getMeta, setMeta } from '../db/sqlite';
import { seedAccounts, seedCategories, seedDebts, seedSettings, seedTx } from '../data/seed';
import { requestSync } from '../sync/sync';

interface FlowState {
  ready: boolean;
  settings: Settings;
  accounts: Account[];
  categories: Category[];
  transactions: Tx[];
  debts: Debt[];
  toast: string;
  init: () => void;
  showToast: (m: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  addTx: (tx: Omit<Tx, 'id'>) => void;
  deleteTx: (id: string) => void;
  saveAccount: (acc: Account) => void;
  deleteAccount: (id: string) => void;
  addCategory: (c: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  addDebt: (d: Omit<Debt, 'id'>) => void;
  settleDebt: (id: string) => void;
  resetToSample: () => void;
}

let toastTimer: ReturnType<typeof setTimeout>;

function applyBalance(accounts: Account[], accId: string, cur: Currency, delta: number): Account[] {
  return accounts.map(a => a.id === accId
    ? { ...a, balances: { ...a.balances, [cur]: Math.round((((a.balances[cur] ?? 0) + delta)) * 100) / 100 } }
    : a);
}

export const useFlow = create<FlowState>((set, get) => ({
  ready: false,
  settings: seedSettings,
  accounts: [], categories: [], transactions: [], debts: [],
  toast: '',

  init: () => {
    initDb();
    if (!getMeta('seeded')) {
      upsert('settings', 'settings', seedSettings, { clean: true });
      for (const a of seedAccounts) upsert('accounts', a.id, a, { clean: true });
      for (const c of seedCategories) upsert('categories', c.id, c, { clean: true });
      for (const t of seedTx) upsert('transactions', t.id, t, { clean: true });
      for (const d of seedDebts) upsert('debts', d.id, d, { clean: true });
      setMeta('seeded', '1');
    }
    set({
      ready: true,
      settings: loadAll<Settings>('settings')[0] ?? seedSettings,
      accounts: loadAll<Account>('accounts'),
      categories: loadAll<Category>('categories'),
      transactions: loadAll<Tx>('transactions'),
      debts: loadAll<Debt>('debts'),
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
    requestSync();
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
    const exists = get().accounts.some(a => a.id === acc.id);
    upsert('accounts', acc.id, acc);
    set({ accounts: exists ? get().accounts.map(a => a.id === acc.id ? acc : a) : [...get().accounts, acc] });
    requestSync();
  },

  deleteAccount: (id) => {
    softDelete('accounts', id);
    set({ accounts: get().accounts.filter(a => a.id !== id) });
    requestSync();
  },

  addCategory: (c) => {
    const cat: Category = { ...c, id: uuid() };
    upsert('categories', cat.id, cat);
    set({ categories: [...get().categories, cat] });
    requestSync();
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

  resetToSample: () => {
    for (const t of get().transactions) softDelete('transactions', t.id);
    for (const a of get().accounts) softDelete('accounts', a.id);
    for (const d of get().debts) softDelete('debts', d.id);
    for (const c of get().categories) softDelete('categories', c.id);
    upsert('settings', 'settings', seedSettings);
    for (const a of seedAccounts) upsert('accounts', a.id, a);
    for (const c of seedCategories) upsert('categories', c.id, c);
    for (const t of seedTx) upsert('transactions', t.id, t);
    for (const d of seedDebts) upsert('debts', d.id, d);
    set({ settings: seedSettings, accounts: seedAccounts, categories: seedCategories, transactions: seedTx, debts: seedDebts });
    requestSync();
  },
}));

// ---- derived selectors (pure) ----
export function netWorthKZT(accounts: Account[], debts: Debt[]) {
  let assets = 0, liab = 0;
  for (const a of accounts) for (const [c, v] of Object.entries(a.balances)) {
    const k = toKZT(v as number, c as Currency);
    if (k >= 0) assets += k; else liab += -k;
  }
  for (const d of debts) {
    const k = toKZT(d.amount, d.currency);
    if (d.dir === 'lent') assets += k; else liab += k;
  }
  return { assets, liab, net: assets - liab };
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

export function categoryTotalsKZT(transactions: Tx[], key: string, kind: 'expense' | 'income') {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== kind || monthKey(t.date) !== key) continue;
    const id = t.categoryId ?? 'other';
    totals[id] = (totals[id] ?? 0) + toKZT(t.amount, t.currency);
  }
  return totals;
}

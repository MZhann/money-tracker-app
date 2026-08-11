import { Account, Category, Debt, Settings, Tx, todayISO } from '../lib/money';

const monthStart = (off: number, day = 3) => {
  const t = new Date(); t.setDate(1); t.setMonth(t.getMonth() - off);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};
const daysAgo = (n: number) => {
  const t = new Date(); t.setDate(t.getDate() - n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

export const seedSettings: Settings = { name: 'Aruzhan', baseCurrency: 'KZT', theme: '' };

export const seedCategories: Category[] = [
  { id: 'c1', name: 'Groceries', kind: 'expense', icon: 'cart', color: 'moss' },
  { id: 'c2', name: 'Dining', kind: 'expense', icon: 'dining', color: 'clay' },
  { id: 'c3', name: 'Transport', kind: 'expense', icon: 'car', color: 'lake' },
  { id: 'c4', name: 'Home', kind: 'expense', icon: 'home', color: 'sun' },
  { id: 'c5', name: 'Health', kind: 'expense', icon: 'health', color: 'clay' },
  { id: 'c6', name: 'Entertainment', kind: 'expense', icon: 'film', color: 'lake' },
  { id: 'c7', name: 'Shopping', kind: 'expense', icon: 'bag', color: 'sun' },
  { id: 'c8', name: 'Subscriptions', kind: 'expense', icon: 'repeat', color: 'moss' },
  { id: 'c9', name: 'Salary', kind: 'income', icon: 'banknote', color: 'moss' },
  { id: 'c10', name: 'Freelance', kind: 'income', icon: 'laptop', color: 'lake' },
  { id: 'c11', name: 'Gifts', kind: 'income', icon: 'gift', color: 'sun' },
  { id: 'c12', name: 'Interest', kind: 'income', icon: 'trend', color: 'moss' },
];

export const seedAccounts: Account[] = [
  { id: 'a1', name: 'Kaspi Gold', type: 'debit', balances: { KZT: 284500 } },
  { id: 'a2', name: 'Freedom Super Card', type: 'debit', balances: { KZT: 118200, USD: 350, EUR: 90 } },
  { id: 'a3', name: 'Cash', type: 'cash', balances: { KZT: 42000 } },
  { id: 'a4', name: 'Halyk Credit', type: 'credit', balances: { KZT: -156000 } },
  { id: 'a5', name: 'Deposit', type: 'savings', balances: { KZT: 1500000 } },
];

export const seedTx: Tx[] = [
  { id: 't1', type: 'income', amount: 650000, currency: 'KZT', accountId: 'a1', categoryId: 'c9', note: '', date: monthStart(0) },
  { id: 't2', type: 'expense', amount: 24600, currency: 'KZT', accountId: 'a1', categoryId: 'c1', note: 'Magnum', date: daysAgo(1) },
  { id: 't3', type: 'expense', amount: 8900, currency: 'KZT', accountId: 'a2', categoryId: 'c2', note: 'Lunch', date: daysAgo(1) },
  { id: 't4', type: 'expense', amount: 3200, currency: 'KZT', accountId: 'a3', categoryId: 'c3', note: '', date: todayISO() },
  { id: 't5', type: 'expense', amount: 12.99, currency: 'USD', accountId: 'a2', categoryId: 'c8', note: 'Music', date: daysAgo(3) },
  { id: 't6', type: 'expense', amount: 18500, currency: 'KZT', accountId: 'a1', categoryId: 'c7', note: '', date: daysAgo(5) },
  { id: 't7', type: 'transfer', amount: 100000, currency: 'KZT', accountId: 'a1', toId: 'a5', note: 'Savings', date: daysAgo(4) },
  { id: 't8', type: 'income', amount: 220, currency: 'USD', accountId: 'a2', categoryId: 'c10', note: 'Design work', date: daysAgo(6) },
  { id: 't9', type: 'income', amount: 650000, currency: 'KZT', accountId: 'a1', categoryId: 'c9', note: '', date: monthStart(1) },
  { id: 't10', type: 'expense', amount: 86000, currency: 'KZT', accountId: 'a1', categoryId: 'c1', note: '', date: monthStart(1, 12) },
  { id: 't11', type: 'expense', amount: 45000, currency: 'KZT', accountId: 'a1', categoryId: 'c4', note: 'Utilities', date: monthStart(1, 15) },
  { id: 't12', type: 'expense', amount: 22000, currency: 'KZT', accountId: 'a2', categoryId: 'c2', note: '', date: monthStart(1, 20) },
  { id: 't13', type: 'income', amount: 650000, currency: 'KZT', accountId: 'a1', categoryId: 'c9', note: '', date: monthStart(2) },
  { id: 't14', type: 'expense', amount: 79000, currency: 'KZT', accountId: 'a1', categoryId: 'c1', note: '', date: monthStart(2, 14) },
  { id: 't15', type: 'expense', amount: 34000, currency: 'KZT', accountId: 'a1', categoryId: 'c7', note: '', date: monthStart(2, 18) },
];

export const seedDebts: Debt[] = [
  { id: 'd1', person: 'Dias', dir: 'lent', amount: 25000, currency: 'KZT' },
  { id: 'd2', person: 'Aigerim', dir: 'borrowed', amount: 40000, currency: 'KZT' },
];

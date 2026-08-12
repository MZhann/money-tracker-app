import { Category, Settings } from '../lib/money';

export const defaultSettings: Settings = { name: '', baseCurrency: 'KZT', theme: '' };

// Starter categories only — accounts, transactions, and debts all start empty.
export const defaultCategories: Category[] = [
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

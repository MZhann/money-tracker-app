export type Currency = 'KZT' | 'USD' | 'EUR' | 'RUB' | 'GBP' | 'CNY' | 'JPY' | 'TRY' | 'AED';
export type AccountType = 'debit' | 'credit' | 'cash' | 'savings';
export type TxType = 'expense' | 'income' | 'transfer';
export type CatColor =
  | 'moss' | 'clay' | 'lake' | 'sun'
  | 'rose' | 'violet' | 'indigo' | 'teal' | 'lime' | 'amber'
  | 'coral' | 'slate' | 'pink' | 'cyan' | 'brown' | 'mint';
export const CAT_COLORS: CatColor[] = [
  'moss', 'clay', 'lake', 'sun', 'rose', 'violet', 'indigo', 'teal',
  'lime', 'amber', 'coral', 'slate', 'pink', 'cyan', 'brown', 'mint',
];

export const CURRENCIES: Currency[] = ['KZT', 'USD', 'EUR', 'RUB', 'GBP', 'CNY', 'JPY', 'TRY', 'AED'];
export const SYM: Record<Currency, string> = { KZT: '₸', USD: '$', EUR: '€', RUB: '₽', GBP: '£', CNY: 'CN¥', JPY: '¥', TRY: '₺', AED: 'Dh' };
// FX to KZT — v1 hardcoded; replace with a rates endpoint later.
export const FX: Record<Currency, number> = { KZT: 1, USD: 540, EUR: 585, RUB: 6.7, GBP: 680, CNY: 75, JPY: 3.6, TRY: 13, AED: 147 };
export const TYPE_LABELS: Record<AccountType, string> = { debit: 'Debit', credit: 'Credit', cash: 'Cash', savings: 'Savings' };

export interface Settings { name: string; baseCurrency: Currency; theme: import('../theme/tokens').ThemeId; }
// Credit accounts: balance is negative = what you owe; `limits` is the credit line
// per currency, display-only — available credit is never counted in net worth.
export interface Account { id: string; name: string; type: AccountType; balances: Partial<Record<Currency, number>>; limits?: Partial<Record<Currency, number>>; order?: number; }
export interface Category { id: string; name: string; kind: 'expense' | 'income'; icon: string; color: CatColor; }
export interface Tx {
  id: string; type: TxType; amount: number; currency: Currency;
  accountId: string; toId?: string | null; categoryId?: string | null;
  note: string; date: string; // YYYY-MM-DD
}
export interface Debt { id: string; person: string; dir: 'lent' | 'borrowed'; amount: number; currency: Currency; }
// Physical property counted in net worth (PS5, phone, home…). Value = what it would sell for today.
export interface Asset { id: string; name: string; value: number; currency: Currency; }

export const uuid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const todayISO = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
export const toKZT = (amount: number, cur: Currency) => amount * FX[cur];

const THIN = '\u2009';
export function grp(n: number): string {
  const neg = n < 0; const abs = Math.abs(n);
  const s = (Number.isInteger(abs) ? String(abs) : abs.toFixed(2)).replace(/\B(?=(\d{3})+(?!\d))/g, THIN);
  return (neg ? '−' : '') + s;
}
/** ₸ 284 500 style; sign: '+' to prefix income, false to omit the minus. */
export function fmt(n: number, cur: Currency, sign?: '+' | false): string {
  const body = `${SYM[cur]}${THIN}${grp(Math.abs(n))}`;
  if (n < 0) return (sign === false ? '' : '−') + body;
  return (sign === '+' ? '+' : '') + body;
}
export const fromKZT = (kzt: number, base: Currency) => kzt / FX[base];

export const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const MONTHS3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const monthKey = (iso: string) => iso.slice(0, 7);
export const monthLabel = (key: string) => `${MONTHS[+key.slice(5, 7) - 1]} ${key.slice(0, 4)}`;
export function addMonths(key: string, n: number): string {
  let y = +key.slice(0, 4), m = +key.slice(5, 7) - 1 + n;
  y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}
export function dateLabel(iso: string): string {
  const t = new Date(); const today = todayISO();
  const y = new Date(t); y.setDate(t.getDate() - 1);
  const yest = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  if (iso === today) return 'Today';
  if (iso === yest) return 'Yesterday';
  return `${+iso.slice(8, 10)} ${MONTHS3[+iso.slice(5, 7) - 1]}${iso.slice(0, 4) !== today.slice(0, 4) ? ' ' + iso.slice(0, 4) : ''}`;
}

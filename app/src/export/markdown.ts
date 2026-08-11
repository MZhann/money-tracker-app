import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Account, Category, Currency, Debt, Settings, SYM, TYPE_LABELS, Tx, addMonths, fmt, fromKZT, grp, monthKey, monthLabel, toKZT, todayISO } from '../lib/money';
import { categoryTotalsKZT, monthFlowKZT, netWorthKZT } from '../store/useFlow';

export async function exportMarkdown(
  settings: Settings, accounts: Account[], categories: Category[], transactions: Tx[], debts: Debt[],
) {
  const base = settings.baseCurrency;
  const nowKey = todayISO().slice(0, 7);
  const f = (kzt: number) => `${grp(fromKZT(kzt, base))} ${SYM[base]}`;
  const cat = (id?: string | null) => categories.find(c => c.id === id);
  const acc = (id?: string | null) => accounts.find(a => a.id === id);

  const { assets, liab, net } = netWorthKZT(accounts, debts);
  const months = [2, 1, 0].map(off => addMonths(nowKey, -off));
  const sumLines = months.map(k => {
    const m = monthFlowKZT(transactions, k);
    return `| ${monthLabel(k)} | +${f(m.inn)} | −${f(m.out)} | ${f(m.inn - m.out)} |`;
  });
  const accLines = accounts.map(a => {
    const tot = Object.entries(a.balances).reduce((s, [c, v]) => s + toKZT(v as number, c as Currency), 0);
    const bals = Object.entries(a.balances).map(([c, v]) => `${grp(v as number)} ${SYM[c as Currency]}`).join(', ');
    return `| ${a.name} | ${TYPE_LABELS[a.type]} | ${bals} | ${f(tot)} |`;
  });
  const totals = categoryTotalsKZT(transactions, nowKey, 'expense');
  const catSum = Object.values(totals).reduce((a, b) => a + b, 0);
  const catLines = Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([id, v]) =>
    `| ${cat(id)?.name ?? 'Other'} | ${f(v)} | ${catSum ? Math.round(v / catSum * 100) : 0}% |`);
  const txLines = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).map(t => {
    const label = t.type === 'transfer' ? 'Transfer' : cat(t.categoryId)?.name ?? '—';
    const account = t.type === 'transfer' ? `${acc(t.accountId)?.name ?? '?'} → ${acc(t.toId)?.name ?? '?'}` : acc(t.accountId)?.name ?? '—';
    const amt = `${t.type === 'expense' ? '−' : t.type === 'income' ? '+' : ''}${grp(t.amount)} ${SYM[t.currency]}`;
    return `| ${t.date} | ${t.type} | ${label} | ${account} | ${amt} | ${t.note} |`;
  });

  const md = [
    '# Flow — money export', '',
    `_Exported ${todayISO()} · amounts ≈ in ${base}_`, '',
    '## Monthly summary', '', '| Month | In | Out | Net |', '|---|---|---|---|', ...sumLines, '',
    '## Accounts & net worth', '', `| Account | Type | Balance | ≈ ${base} |`, '|---|---|---|---|', ...accLines, '',
    `- **Assets:** ${f(assets)}`, `- **Liabilities:** ${f(liab)}`, `- **Net worth:** ${f(net)}`, '',
    `## Category breakdown — ${monthLabel(nowKey)}`, '', '| Category | Spent | Share |', '|---|---|---|', ...catLines, '',
    '## Transactions', '', '| Date | Type | Category | Account | Amount | Note |', '|---|---|---|---|---|---|', ...txLines, '',
  ].join('\n');

  const uri = `${FileSystem.cacheDirectory}flow-${nowKey}.md`;
  await FileSystem.writeAsStringAsync(uri, md);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'text/markdown', dialogTitle: 'Flow export' });
  }
  return uri;
}

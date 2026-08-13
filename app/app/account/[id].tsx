import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, CategoryIcon, Icon } from '@/components/ui';
import { Currency, TYPE_LABELS, Tx, addMonths, dateLabel, fmt, fromKZT, monthKey, toKZT } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

type Range = 'all' | 'month' | 'prev' | '3m';
const RANGES: { value: Range; label: string }[] = [
  { value: 'all', label: 'All time' }, { value: 'month', label: 'This month' },
  { value: 'prev', label: 'Last month' }, { value: '3m', label: '3 months' },
];

export default function AccountDetail() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings, accounts, categories, transactions } = useFlow();
  const base = settings.baseCurrency;
  const account = accounts.find(a => a.id === id);

  const [query, setQuery] = useState('');
  const [range, setRange] = useState<Range>('month');

  const nowKey = new Date().toISOString().slice(0, 7);
  const prevKey = addMonths(nowKey, -1);

  const filtered = useMemo(() => {
    if (!account) return [];
    const q = query.trim().toLowerCase();
    return transactions
      .filter(tx => tx.accountId === account.id || (tx.type === 'transfer' && tx.toId === account.id))
      .filter(tx => {
        const k = monthKey(tx.date);
        if (range === 'month') return k === nowKey;
        if (range === 'prev') return k === prevKey;
        if (range === '3m') return tx.date >= `${addMonths(nowKey, -2)}-01`;
        return true;
      })
      .filter(tx => {
        if (!q) return true;
        const cat = categories.find(c => c.id === tx.categoryId);
        return tx.note.toLowerCase().includes(q)
          || (cat?.name.toLowerCase().includes(q) ?? false)
          || String(tx.amount).includes(q)
          || tx.date.includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [account, transactions, categories, query, range, nowKey, prevKey]);

  if (!account) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: font.body, fontSize: 14, color: t.textMuted }}>This account no longer exists.</Text>
      </View>
    );
  }

  // In = income + transfers in; Out = expense + transfers out — from the filtered set.
  let inn = 0, out = 0;
  for (const tx of filtered) {
    const v = toKZT(tx.amount, tx.currency);
    if (tx.type === 'income') inn += v;
    else if (tx.type === 'expense') out += v;
    else if (tx.type === 'transfer') {
      if (tx.toId === account.id) inn += v;
      if (tx.accountId === account.id) out += v;
    }
  }

  const groups: { label: string; rows: Tx[] }[] = [];
  for (const tx of filtered) {
    const label = dateLabel(tx.date);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(tx);
    else groups.push({ label, rows: [tx] });
  }

  const entries = Object.entries(account.balances) as [Currency, number][];
  const tot = entries.reduce((s, [c, v]) => s + toKZT(v, c), 0);
  const cat = (cid?: string | null) => categories.find(c => c.id === cid);

  // Long-press opens the full editor; deleting lives there now.
  const openEdit = (tx: Tx) => router.push({ pathname: '/sheets/add-transaction', params: { id: tx.id } });

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: space(5), paddingBottom: 32, gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color={t.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.display, fontSize: 22, color: t.textBody, letterSpacing: -0.4 }}>{account.name}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 11.5, color: t.textFaint }}>{TYPE_LABELS[account.type]}</Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: '/sheets/edit-account', params: { id: account.id } })} hitSlop={8}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.surfaceSunken, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pencil" size={16} color={t.textMuted} />
        </Pressable>
      </View>

      <Card style={{ padding: 16, gap: 6 }}>
        {entries.map(([c, v]) => {
          const limit = account.type === 'credit' ? account.limits?.[c] : undefined;
          if (limit) {
            const owed = Math.max(0, -v);
            return (
              <View key={c} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{c} · used {fmt(owed, c, false)} of {fmt(limit, c, false)}</Text>
                  <AmountText str={fmt(owed, c, false)} size={18} color={owed > 0 ? t.negative : t.textBody} />
                </View>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: t.surfaceSunken, overflow: 'hidden' }}>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: t.negative, width: `${Math.min(100, owed / limit * 100)}%` }} />
                </View>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>available {fmt(Math.max(0, limit - owed), c, false)}</Text>
              </View>
            );
          }
          return (
            <View key={c} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{c}</Text>
              <AmountText str={fmt(v, c)} size={18} color={v < 0 ? t.negative : t.textBody} />
            </View>
          );
        })}
        {entries.length > 1 && (
          <Text style={{ fontFamily: font.mono, fontSize: 11, color: t.textFaint, textAlign: 'right' }}>≈ {fmt(fromKZT(tot, base), base)}</Text>
        )}
      </Card>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[{ label: 'In', val: inn, color: t.positive, sign: '+' }, { label: 'Out', val: out, color: t.negative, sign: '−' }, { label: 'Net', val: inn - out, color: inn - out >= 0 ? t.positive : t.negative, sign: inn - out >= 0 ? '+' : '−' }].map(s => (
          <Card key={s.label} style={{ flex: 1, padding: 12 }}>
            <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{s.label}</Text>
            <AmountText str={`${s.val === 0 ? '' : s.sign}${fmt(fromKZT(Math.abs(s.val), base), base, false)}`} size={14} color={s.val === 0 ? t.textBody : s.color} />
          </Card>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: t.surfaceRaised }}>
        <Icon name="search" size={16} color={t.textFaint} />
        <TextInput
          value={query} onChangeText={setQuery} placeholder="Search note, category, amount…" placeholderTextColor={t.textFaint}
          style={{ flex: 1, paddingVertical: 10, fontFamily: font.body, fontSize: 14, color: t.textBody }}
        />
        {query !== '' && (
          <Pressable hitSlop={8} onPress={() => setQuery('')}>
            <Icon name="x" size={14} color={t.textFaint} stroke={2} />
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {RANGES.map(r => (
          <Pressable key={r.value} onPress={() => setRange(r.value)} style={{
            height: 34, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center',
            borderWidth: 1, borderColor: range === r.value ? t.accent : t.borderSoft,
            backgroundColor: range === r.value ? t.accentSoft : t.surfaceRaised,
          }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 12.5, color: range === r.value ? t.accentDeep : t.textMuted }}>{r.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {groups.length === 0 && (
        <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center', paddingVertical: 32 }}>
          {query ? 'Nothing matches your search here.' : 'No transactions in this period.'}
        </Text>
      )}
      {groups.map(g => (
        <View key={g.label} style={{ gap: 6 }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: t.textFaint }}>{g.label}</Text>
          <Card>
            {g.rows.map((tx, i) => {
              const c = cat(tx.categoryId);
              const incoming = tx.type === 'income' || (tx.type === 'transfer' && tx.toId === account.id);
              const label = tx.type === 'transfer'
                ? (incoming ? `From ${accounts.find(a => a.id === tx.accountId)?.name ?? '?'}` : `To ${accounts.find(a => a.id === tx.toId)?.name ?? '?'}`)
                : c?.name ?? 'Other';
              return (
                <Pressable key={tx.id} delayLongPress={250} onLongPress={() => openEdit(tx)} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11,
                  borderBottomWidth: i < g.rows.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
                }}>
                  {tx.type === 'transfer'
                    ? <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.transferSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="transfer" size={18} color={t.transfer} />
                      </View>
                    : <CategoryIcon icon={c?.icon ?? 'cart'} color={c?.color ?? 'moss'} />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: t.textBody }}>{label}</Text>
                    {tx.note !== '' && <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 11.5, color: t.textFaint }}>{tx.note}</Text>}
                  </View>
                  <AmountText
                    str={`${incoming ? '+' : '−'}${fmt(tx.amount, tx.currency, false)}`}
                    size={14} color={incoming ? t.positive : t.textBody}
                  />
                </Pressable>
              );
            })}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

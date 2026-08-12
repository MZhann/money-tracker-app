import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, CapsLabel, CategoryIcon, Icon } from '@/components/ui';
import { Tx, dateLabel, fmt, fromKZT } from '@/lib/money';
import { monthFlowKZT, netWorthKZT, useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Home() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, accounts, categories, transactions, debts, assets, deleteTx, showToast } = useFlow();
  const base = settings.baseCurrency;

  const hour = new Date().getHours();
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const initials = settings.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const { net } = netWorthKZT(accounts, debts, assets);
  const nowKey = new Date().toISOString().slice(0, 7);
  const flow = monthFlowKZT(transactions, nowKey);

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);
  const groups: { label: string; rows: Tx[] }[] = [];
  for (const tx of sorted) {
    const label = dateLabel(tx.date);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.rows.push(tx);
    else groups.push({ label, rows: [tx] });
  }
  const cat = (id?: string | null) => categories.find(c => c.id === id);
  const acc = (id?: string | null) => accounts.find(a => a.id === id);

  const confirmDelete = (tx: Tx) =>
    Alert.alert('Delete transaction?', 'Balances will be adjusted back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteTx(tx.id); showToast('Transaction removed'); } },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(5) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textMuted }}>{greeting}</Text>
          <Text style={{ fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>{settings.name}</Text>
        </View>
        <Pressable onPress={() => router.push('/profile')} style={({ pressed }) => ({
          width: 44, height: 44, borderRadius: 22, backgroundColor: t.accentSoft,
          alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.96 : 1 }],
        })}>
          <Text style={{ fontFamily: font.display, fontSize: 16, color: t.accentDeep }}>{initials}</Text>
        </Pressable>
      </View>

      {/* Hero — theme ambient scenes: see design_handoff README ("Theme scenery"); add react-native-svg scenes here per theme. */}
      <View style={{ borderRadius: radius.xl, padding: 20, paddingVertical: 22, backgroundColor: t.heroA, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', right: -30, top: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: t.onHero, opacity: 0.75 }}>Net worth</Text>
        <AmountText str={fmt(fromKZT(net, base), base)} color={t.onHero} size={34} />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          {[
            { label: 'In this month', val: fmt(fromKZT(flow.inn, base), base, '+') },
            { label: 'Out this month', val: '−' + fmt(fromKZT(flow.out, base), base, false) },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: radius.md, padding: 10 }}>
              <Text style={{ fontFamily: font.body, fontSize: 11, color: t.onHero, opacity: 0.75 }}>{s.label}</Text>
              <AmountText str={s.val} color={t.onHero} size={15} />
            </View>
          ))}
        </View>
      </View>

      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>Recent</Text>
      {groups.length === 0 && (
        <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center', paddingVertical: 32 }}>
          Nothing here yet — add a transaction to see your flow.
        </Text>
      )}
      {groups.map(g => (
        <View key={g.label} style={{ gap: 6 }}>
          <CapsLabel>{g.label}</CapsLabel>
          <Card>
            {g.rows.map((tx, i) => {
              const c = cat(tx.categoryId);
              const isTr = tx.type === 'transfer';
              const amtColor = tx.type === 'expense' ? t.negative : tx.type === 'income' ? t.positive : t.transfer;
              const sign = tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : '';
              return (
                <View key={tx.id} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
                  borderBottomWidth: i < g.rows.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
                }}>
                  {isTr
                    ? <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.transferSoft, alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="transfer" size={20} color={t.transfer} />
                      </View>
                    : <CategoryIcon icon={c?.icon ?? 'cart'} color={c?.color ?? 'moss'} />}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: font.bodyMedium, fontSize: 15, color: t.textBody }}>
                      {isTr ? 'Transfer' : c?.name ?? 'Other'}
                    </Text>
                    <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>
                      {isTr ? `${acc(tx.accountId)?.name ?? '?'} → ${acc(tx.toId)?.name ?? '?'}` : acc(tx.accountId)?.name ?? '—'}
                      {tx.note ? ` · ${tx.note}` : ''}
                    </Text>
                  </View>
                  <AmountText str={sign + fmt(tx.amount, tx.currency, false)} color={amtColor} />
                  <Pressable onPress={() => confirmDelete(tx)} hitSlop={8} style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={15} color={t.textFaint} />
                  </Pressable>
                </View>
              );
            })}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

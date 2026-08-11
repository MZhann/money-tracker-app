import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, Icon } from '@/components/ui';
import { Currency, TYPE_LABELS, addMonths, fmt, fromKZT, monthLabel, toKZT } from '@/lib/money';
import { categoryTotalsKZT, monthFlowKZT, netWorthKZT, useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Reports() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, accounts, categories, transactions, debts, settleDebt, showToast } = useFlow();
  const base = settings.baseCurrency;
  const f = (kzt: number, sign?: '+' | false) => fmt(fromKZT(kzt, base), base, sign);

  const { assets, liab, net } = netWorthKZT(accounts, debts);
  const nowKey = new Date().toISOString().slice(0, 7);
  const prevKey = addMonths(nowKey, -1);
  const flow = monthFlowKZT(transactions, nowKey);
  const prev = monthFlowKZT(transactions, prevKey);

  // "AI" insights — computed locally for v1; swap for a server endpoint later.
  const totals = categoryTotalsKZT(transactions, nowKey, 'expense');
  const out = Object.values(totals).reduce((a, b) => a + b, 0);
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  const insights: string[] = [];
  if (top) {
    const c = categories.find(x => x.id === top[0]);
    insights.push(`${c?.name ?? 'Other'} was your biggest expense — ${f(top[1])}, about ${Math.round(top[1] / out * 100)}% of this month's spending.`);
  }
  if (prev.out > 0 && flow.out > 0) {
    const delta = Math.round((flow.out - prev.out) / prev.out * 100);
    insights.push(delta <= 0
      ? `You spent ${Math.abs(delta)}% less than in ${monthLabel(prevKey).split(' ')[0]} — nice and steady.`
      : `Spending is up ${delta}% vs ${monthLabel(prevKey).split(' ')[0]} — mostly fine if it was planned.`);
  }
  if (flow.inn > 0) insights.push(`You kept ${Math.max(0, Math.round((flow.inn - flow.out) / flow.inn * 100))}% of your income this month.`);
  if (!insights.length) insights.push("Add a few transactions and I'll tell you what stands out.");

  const confirmSettle = (id: string) =>
    Alert.alert('Settle debt?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle', onPress: () => { settleDebt(id); showToast('Debt settled'); } },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(4) }}>
      <Text style={{ fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>Reports</Text>

      <Card style={{ padding: 16 }}>
        <Row label="Assets" right={<AmountText str={f(assets)} color={t.positive} />} t={t} />
        <Row label="Liabilities" right={<AmountText str={liab > 0 ? '−' + f(liab, false) : f(0)} color={t.negative} />} t={t} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 6, borderTopWidth: 1, borderTopColor: t.borderSoft }}>
          <Text style={{ fontFamily: font.bodySemiBold, fontSize: 15, color: t.textBody }}>Net worth</Text>
          <AmountText str={f(net)} size={17} />
        </View>
      </Card>

      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="sparkle" size={18} color={t.accent} />
          <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody }}>AI analysis</Text>
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint, marginBottom: 8 }}>Here's what stood out this month</Text>
        {insights.map((p, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.accent, marginTop: 7 }} />
            <Text style={{ flex: 1, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: t.textBody }}>{p}</Text>
          </View>
        ))}
      </Card>

      <Card style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody, paddingVertical: 8 }}>Accounts</Text>
        {accounts.map((a, i) => {
          const tot = Object.entries(a.balances).reduce((s, [c, v]) => s + toKZT(v as number, c as Currency), 0);
          return (
            <View key={a.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i < accounts.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft }}>
              <View>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: t.textBody }}>{a.name}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{TYPE_LABELS[a.type]}</Text>
              </View>
              <AmountText str={f(tot)} size={14} color={tot < 0 ? t.negative : t.textBody} weight="regular" />
            </View>
          );
        })}
      </Card>

      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody }}>Debts</Text>
          <Pressable onPress={() => router.push('/sheets/add-debt')} style={({ pressed }) => ({
            height: 32, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: t.accentSoft,
            alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }],
          })}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: t.accentDeep }}>+ Add</Text>
          </Pressable>
        </View>
        {debts.length === 0 && (
          <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, paddingVertical: 10 }}>All caught up — no debts tracked.</Text>
        )}
        {debts.map((d, i) => (
          <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i < debts.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: t.textBody }}>{d.person}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{d.dir === 'lent' ? 'owes you' : 'you owe'}</Text>
            </View>
            <AmountText str={fmt(d.amount, d.currency, false)} size={14} color={d.dir === 'lent' ? t.positive : t.negative} />
            <Pressable onPress={() => confirmSettle(d.id)} style={{ height: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: t.surfaceSunken, justifyContent: 'center' }}>
              <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textMuted }}>Settle</Text>
            </Pressable>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function Row({ label, right, t }: { label: string; right: React.ReactNode; t: ReturnType<typeof useTheme> }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ fontFamily: font.body, fontSize: 14, color: t.textMuted }}>{label}</Text>
      {right}
    </View>
  );
}

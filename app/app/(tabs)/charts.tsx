import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, CategoryIcon, Icon, Segmented } from '@/components/ui';
import { MONTHS3, addMonths, fmt, fromKZT, monthLabel } from '@/lib/money';
import { categoryTotalsKZT, monthFlowKZT, useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { catTint } from '@/components/ui';

export default function Charts() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, categories, transactions } = useFlow();
  const base = settings.baseCurrency;
  const nowKey = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(nowKey);
  const [mode, setMode] = useState<'expense' | 'income'>('expense');

  const barKeys = [5, 4, 3, 2, 1, 0].map(off => addMonths(nowKey, -off));
  const flows = barKeys.map(k => ({ k, ...monthFlowKZT(transactions, k) }));
  const maxV = Math.max(1, ...flows.map(f => Math.max(f.inn, f.out)));
  const sel = monthFlowKZT(transactions, month);

  const totals = categoryTotalsKZT(transactions, month, mode);
  const catSum = Object.values(totals).reduce((a, b) => a + b, 0);
  const breakdown = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(4) }}>
      <Text style={{ fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>Charts</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => setMonth(addMonths(month, -1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color={t.textMuted} />
        </Pressable>
        <Text style={{ fontFamily: font.display, fontSize: 17, color: t.textBody }}>{monthLabel(month)}</Text>
        <Pressable disabled={month >= nowKey} onPress={() => setMonth(addMonths(month, 1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronRight" size={20} color={month < nowKey ? t.textMuted : t.borderSoft} />
        </Pressable>
      </View>

      <Card style={{ padding: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingHorizontal: 4 }}>
          {flows.map(f => {
            const selMonth = f.k === month;
            return (
              <Pressable key={f.k} onPress={() => setMonth(f.k)} style={{ alignItems: 'center', gap: 6, opacity: selMonth ? 1 : 0.45, justifyContent: 'flex-end', height: '100%' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                  <View style={{ width: 10, borderRadius: 5, backgroundColor: t.positive, height: Math.max(f.inn > 0 ? 5 : 2, Math.round(f.inn / maxV * 108)) }} />
                  <View style={{ width: 10, borderRadius: 5, backgroundColor: t.negative, height: Math.max(f.out > 0 ? 5 : 2, Math.round(f.out / maxV * 108)) }} />
                </View>
                <Text style={{ fontFamily: selMonth ? font.bodySemiBold : font.body, fontSize: 11, color: selMonth ? t.textBody : t.textFaint }}>
                  {MONTHS3[+f.k.slice(5, 7) - 1]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: t.borderSoft }}>
          {[{ dot: t.positive, label: 'In', val: sel.inn }, { dot: t.negative, label: 'Out', val: sel.out }].map(l => (
            <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: l.dot }} />
              <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textMuted }}>{l.label}</Text>
              <AmountText str={fmt(fromKZT(l.val, base), base)} size={12} />
            </View>
          ))}
        </View>
      </Card>

      <Segmented
        options={[{ value: 'expense', label: 'Where it went' }, { value: 'income', label: 'Where it came from' }]}
        value={mode} onChange={setMode}
      />

      {breakdown.length === 0 ? (
        <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center', paddingVertical: 24 }}>
          {mode === 'expense' ? 'Nothing spent this month yet.' : 'No income recorded this month.'}
        </Text>
      ) : (
        <Card style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
          {breakdown.map(([id, v], i) => {
            const c = categories.find(x => x.id === id);
            const tint = catTint(t, c?.color ?? 'moss');
            const pct = catSum ? Math.round(v / catSum * 100) : 0;
            return (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: i < breakdown.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft }}>
                <CategoryIcon icon={c?.icon ?? 'cart'} color={c?.color ?? 'moss'} size={36} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: t.textBody }}>{c?.name ?? 'Other'}</Text>
                    <AmountText str={fmt(fromKZT(v, base), base)} size={13} weight="regular" />
                  </View>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: t.surfaceSunken, marginTop: 6, overflow: 'hidden' }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: tint.fg, width: `${pct}%` }} />
                  </View>
                </View>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint, width: 34, textAlign: 'right' }}>{pct}%</Text>
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

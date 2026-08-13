import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { AmountText, Card, CategoryIcon, Icon, Segmented } from '@/components/ui';
import { MONTHS3, addMonths, dateLabel, fmt, fromKZT, monthKey, monthLabel } from '@/lib/money';
import { categoryTotalsKZT, monthFlowKZT, useFlow } from '@/store/useFlow';
import { smooth } from '@/lib/anim';
import { font, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { catTint } from '@/components/ui';

type ChartKind = 'bars' | 'pie';
const KINDS: ChartKind[] = ['bars', 'pie'];

/** Donut of category shares. Slices: pre-sorted { value, color }. */
function Donut({ slices, size = 172, thickness = 30 }: { slices: { value: number; color: string }[]; size?: number; thickness?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const R = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  if (slices.length === 1) {
    return (
      <Svg width={size} height={size}>
        <Circle cx={cx} cy={cy} r={R} stroke={slices[0].color} strokeWidth={thickness} fill="none" />
      </Svg>
    );
  }
  let ang = -Math.PI / 2;
  const GAP = 0.03; // small gap between slices, in radians
  return (
    <Svg width={size} height={size}>
      {slices.map((s, i) => {
        const sweep = (s.value / total) * Math.PI * 2;
        const a0 = ang + GAP / 2, a1 = ang + sweep - GAP / 2;
        ang += sweep;
        if (a1 <= a0) return null;
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
        const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
        return (
          <Path key={i} d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1}`}
            stroke={s.color} strokeWidth={thickness} strokeLinecap="butt" fill="none" />
        );
      })}
    </Svg>
  );
}

export default function Charts() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { settings, categories, accounts, transactions, setSettings } = useFlow();
  const base = settings.baseCurrency;
  const nowKey = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(nowKey);
  const [mode, setMode] = useState<'expense' | 'income'>('expense');
  // Which breakdown category is expanded to show its transactions.
  const [openCat, setOpenCat] = useState<string | null>(null);
  useEffect(() => { setOpenCat(null); }, [month, mode]);

  // Animated wrappers: bars, breakdown list and expansions glide instead of snapping.
  const changeMonth = (m: string) => { smooth(); setMonth(m); };
  const changeMode = (m: 'expense' | 'income') => { smooth(); setMode(m); };
  const toggleCat = (id: string) => { smooth(260); setOpenCat(prev => prev === id ? null : id); };

  // Pie re-entrance: quick fade + scale spring whenever its data changes.
  const pieAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pieAnim.setValue(0);
    Animated.spring(pieAnim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [month, mode]);

  const barKeys = [5, 4, 3, 2, 1, 0].map(off => addMonths(nowKey, -off));
  const flows = barKeys.map(k => ({ k, ...monthFlowKZT(transactions, k) }));
  const maxV = Math.max(1, ...flows.map(f => Math.max(f.inn, f.out)));
  const sel = monthFlowKZT(transactions, month);

  const totals = categoryTotalsKZT(transactions, month, mode);
  const catSum = Object.values(totals).reduce((a, b) => a + b, 0);
  const breakdown = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  // Swipeable chart pager; the page you land on is remembered as the default.
  const [chart, setChart] = useState<ChartKind>(settings.chartKind ?? 'bars');
  const pagerRef = useRef<ScrollView>(null);
  useEffect(() => {
    if ((settings.chartKind ?? 'bars') === 'pie') pagerRef.current?.scrollTo({ x: width, animated: false });
  }, []);
  const onPageSettle = (x: number) => {
    const k = KINDS[Math.min(KINDS.length - 1, Math.max(0, Math.round(x / width)))];
    if (k !== chart) { setChart(k); setSettings({ chartKind: k }); }
  };

  const slices = breakdown.map(([id, v]) => {
    const c = categories.find(x => x.id === id);
    return { value: v, color: catTint(t, c?.color ?? 'moss').fg, name: c?.name ?? 'Other' };
  });
  const LEGEND_MAX = 6;

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(4) }}>
      <Text style={{ fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>Charts</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => changeMonth(addMonths(month, -1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color={t.textMuted} />
        </Pressable>
        <Text style={{ fontFamily: font.display, fontSize: 17, color: t.textBody }}>{monthLabel(month)}</Text>
        <Pressable disabled={month >= nowKey} onPress={() => changeMonth(addMonths(month, 1))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronRight" size={20} color={month < nowKey ? t.textMuted : t.borderSoft} />
        </Pressable>
      </View>

      <Segmented
        options={[{ value: 'expense', label: 'Where it went' }, { value: 'income', label: 'Where it came from' }]}
        value={mode} onChange={changeMode}
      />

      <View style={{ marginHorizontal: -space(5) }}>
        <ScrollView
          ref={pagerRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => onPageSettle(e.nativeEvent.contentOffset.x)}
        >
          <View style={{ width, paddingHorizontal: space(5) }}>
            <Card style={{ padding: 16, paddingBottom: 12, flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 150, paddingHorizontal: 4 }}>
                {flows.map(f => {
                  const selMonth = f.k === month;
                  return (
                    <Pressable key={f.k} onPress={() => changeMonth(f.k)} style={{ alignItems: 'center', gap: 6, opacity: selMonth ? 1 : 0.45, justifyContent: 'flex-end', height: '100%' }}>
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
          </View>

          <View style={{ width, paddingHorizontal: space(5) }}>
            <Card style={{ padding: 16, flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 214 }}>
              {catSum === 0 ? (
                <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center' }}>
                  {mode === 'expense' ? 'Nothing spent this month yet.' : 'No income recorded this month.'}
                </Text>
              ) : (
                <Animated.View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%',
                  opacity: pieAnim, transform: [{ scale: pieAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
                }}>
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Donut slices={slices} size={148} thickness={26} />
                    <View style={{ position: 'absolute', alignItems: 'center' }}>
                      <Text style={{ fontFamily: font.body, fontSize: 10.5, color: t.textFaint }}>
                        {mode === 'expense' ? 'Spent' : 'Earned'}
                      </Text>
                      <AmountText str={fmt(fromKZT(catSum, base), base)} size={13} />
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    {slices.slice(0, LEGEND_MAX).map((s, i) => (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                        <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: s.color }} />
                        <Text numberOfLines={1} style={{ flex: 1, fontFamily: font.body, fontSize: 12, color: t.textBody }}>{s.name}</Text>
                        <Text style={{ fontFamily: font.mono, fontSize: 11, color: t.textMuted }}>{Math.round(s.value / catSum * 100)}%</Text>
                      </View>
                    ))}
                    {slices.length > LEGEND_MAX && (
                      <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>+{slices.length - LEGEND_MAX} more below</Text>
                    )}
                  </View>
                </Animated.View>
              )}
            </Card>
          </View>
        </ScrollView>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: -space(2) }}>
        {KINDS.map(k => (
          <View key={k} style={{ width: chart === k ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: chart === k ? t.accent : t.borderStrong }} />
        ))}
      </View>

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
            const open = openCat === id;
            const catTxs = open
              ? transactions
                  .filter(tx => tx.type === mode && tx.categoryId === id && monthKey(tx.date) === month)
                  .sort((a, b) => b.date.localeCompare(a.date))
              : [];
            return (
              <View key={id} style={{ borderBottomWidth: i < breakdown.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft }}>
                <Pressable onPress={() => toggleCat(id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, opacity: pressed ? 0.7 : 1 })}>
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
                  <View style={{ width: 34, alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{pct}%</Text>
                    <Icon name={open ? 'arrowUp' : 'chevronDown'} size={12} color={t.textFaint} stroke={2} />
                  </View>
                </Pressable>
                {open && catTxs.map(tx => (
                  <Pressable key={tx.id} delayLongPress={250}
                    onLongPress={() => router.push({ pathname: '/sheets/add-transaction', params: { id: tx.id } })}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 48, paddingVertical: 7,
                      backgroundColor: pressed ? t.surfaceSunken : 'transparent',
                    })}>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 12.5, color: t.textBody }}>
                        {dateLabel(tx.date)}{tx.note ? ` · ${tx.note}` : ''}
                      </Text>
                      <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 10.5, color: t.textFaint }}>
                        {accounts.find(a => a.id === tx.accountId)?.name ?? '—'}
                      </Text>
                    </View>
                    <AmountText str={fmt(tx.amount, tx.currency, false)} size={12.5} color={mode === 'expense' ? t.textBody : t.positive} />
                  </Pressable>
                ))}
                {open && catTxs.length === 0 && (
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: t.textFaint, paddingLeft: 48, paddingBottom: 10 }}>
                    No transactions this month.
                  </Text>
                )}
                {open && <View style={{ height: 6 }} />}
              </View>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

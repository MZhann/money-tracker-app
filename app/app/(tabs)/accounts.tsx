import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, Icon } from '@/components/ui';
import { DragGrid } from '@/components/DragGrid';
import { AccountType, Currency, TYPE_LABELS, fmt, fromKZT, toKZT } from '@/lib/money';
import { accountMonthFlowKZT, netWorthKZT, useFlow } from '@/store/useFlow';
import { Palette, font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TYPE_ICON: Record<AccountType, string> = { debit: 'wallet', credit: 'card', cash: 'banknote', savings: 'trend' };
const typeTint = (t: Palette, ty: AccountType) =>
  ty === 'credit' ? { bg: t.negativeSoft, fg: t.negative }
  : ty === 'savings' ? { bg: t.transferSoft, fg: t.transfer }
  : ty === 'cash' ? { bg: t.warningSoft, fg: t.warning }
  : { bg: t.accentSoft, fg: t.accentDeep };

export default function Accounts() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, accounts, debts, assets, reorderAccounts } = useFlow();
  const base = settings.baseCurrency;
  const { net } = netWorthKZT(accounts, debts, assets);
  const { transactions } = useFlow();
  const nowKey = new Date().toISOString().slice(0, 7);
  const [dragging, setDragging] = useState(false);

  // One row per person; individual records live on the /debt/[person] screen.
  const debtGroups = (() => {
    const m = new Map<string, { key: string; name: string; entries: typeof debts }>();
    for (const d of debts) {
      const key = d.person.trim().toLowerCase();
      const g = m.get(key);
      if (g) g.entries.push(d);
      else m.set(key, { key, name: d.person.trim(), entries: [d] });
    }
    return [...m.values()];
  })();

  return (
    <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ flex: 1, fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>Accounts</Text>
        <AmountText str={'net ≈ ' + fmt(fromKZT(net, base), base)} size={14} color={t.textMuted} weight="regular" />
      </View>

      <Card>
        {accounts.length === 0 && (
          <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center', padding: 20 }}>
            No accounts yet — add your first card or wallet below.
          </Text>
        )}
        {/* Long-press a row and drag to rearrange, like app icons on a home screen. */}
        {accounts.length > 0 && (
          <DragGrid
            data={accounts}
            keyOf={a => a.id}
            columns={1}
            itemHeight={68}
            onDragActive={setDragging}
            onReorder={reorderAccounts}
            onPressItem={a => router.push({ pathname: '/account/[id]', params: { id: a.id } })}
            renderItem={(a, i, drag, pressed) => {
              const entries = Object.entries(a.balances) as [Currency, number][];
              const tot = entries.reduce((s, [c, v]) => s + toKZT(v, c), 0);
              const single = entries.length === 1 ? entries[0] : null;
              const flow = accountMonthFlowKZT(transactions, a.id, nowKey);
              const tint = typeTint(t, a.type);
              return (
                <View style={{
                  flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14,
                  borderBottomWidth: !drag && i < accounts.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
                  backgroundColor: drag ? t.surfaceRaised : pressed ? t.surfaceSunken : 'transparent',
                  borderRadius: drag ? radius.md : 0,
                  borderTopLeftRadius: drag ? radius.md : i === 0 ? radius.lg : 0,
                  borderTopRightRadius: drag ? radius.md : i === 0 ? radius.lg : 0,
                  borderBottomLeftRadius: drag ? radius.md : i === accounts.length - 1 ? radius.lg : 0,
                  borderBottomRightRadius: drag ? radius.md : i === accounts.length - 1 ? radius.lg : 0,
                  borderWidth: drag ? 1 : 0, borderColor: t.borderSoft,
                }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={TYPE_ICON[a.type]} size={20} color={tint.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, color: t.textBody }}>{a.name}</Text>
                    {flow !== 0 ? (
                      <AmountText
                        str={`${flow > 0 ? '+' : '−'}${fmt(fromKZT(Math.abs(flow), base), base, false)} this month`}
                        size={11.5} weight="regular" color={flow > 0 ? t.positive : t.negative}
                      />
                    ) : (
                      <Text style={{ fontFamily: font.body, fontSize: 11.5, color: t.textFaint }}>{TYPE_LABELS[a.type]}</Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AmountText
                      str={single ? fmt(single[1], single[0]) : '≈ ' + fmt(fromKZT(tot, base), base)}
                      size={15} color={tot < 0 ? t.negative : t.textBody}
                    />
                    {!single && (
                      <Text style={{ fontFamily: font.body, fontSize: 10.5, color: t.textFaint }}>
                        {entries.map(([c]) => c).join(' · ')}
                      </Text>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </Card>

      <Pressable onPress={() => router.push('/sheets/edit-account')} style={({ pressed }) => ({
        height: 52, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.borderStrong,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.99 : 1 }],
      })}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: t.textMuted }}>+ Add account</Text>
      </Pressable>

      <Card style={{ padding: 16, marginTop: space(2) }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody }}>Property</Text>
          <Pressable onPress={() => router.push('/sheets/edit-asset')} style={({ pressed }) => ({
            height: 32, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: t.accentSoft,
            alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }],
          })}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: t.accentDeep }}>+ Add</Text>
          </Pressable>
        </View>
        {assets.length === 0 && (
          <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, paddingVertical: 10 }}>
            Things you own that count toward net worth — a phone, a console, a home.
          </Text>
        )}
        {assets.map((a, i) => (
          <Pressable key={a.id} onPress={() => router.push({ pathname: '/sheets/edit-asset', params: { id: a.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i < assets.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft }}>
            <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: t.textBody }}>{a.name}</Text>
            <AmountText str={fmt(a.value, a.currency, false)} size={14} />
          </Pressable>
        ))}
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
        {debtGroups.length === 0 && (
          <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, paddingVertical: 10 }}>All caught up — no debts tracked.</Text>
        )}
        {debtGroups.map((g, i) => {
          const netKZT = g.entries.reduce((s, d) => s + (d.dir === 'lent' ? 1 : -1) * toKZT(d.amount, d.currency), 0);
          const single = new Set(g.entries.map(d => d.currency)).size === 1 ? g.entries[0].currency : null;
          const netRaw = single ? g.entries.reduce((s, d) => s + (d.dir === 'lent' ? 1 : -1) * d.amount, 0) : 0;
          const n = g.entries.length;
          return (
            <Pressable key={g.key} onPress={() => router.push({ pathname: '/debt/[person]', params: { person: g.name } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i < debtGroups.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: t.textBody }}>{g.name}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>
                  {n} {n === 1 ? 'record' : 'records'} · {netKZT > 0 ? 'owes you' : netKZT < 0 ? 'you owe' : 'settled up'}
                </Text>
              </View>
              <AmountText
                str={single ? fmt(Math.abs(netRaw), single, false) : '≈ ' + fmt(fromKZT(Math.abs(netKZT), base), base, false)}
                size={14} color={netKZT > 0 ? t.positive : netKZT < 0 ? t.negative : t.textMuted}
              />
              <Icon name="chevronRight" size={15} color={t.textFaint} />
            </Pressable>
          );
        })}
      </Card>
    </ScrollView>
  );
}

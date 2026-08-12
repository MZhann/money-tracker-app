import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, Icon } from '@/components/ui';
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
  const { settings, accounts, debts, assets, settleDebt, moveAccount, showToast } = useFlow();
  const base = settings.baseCurrency;
  const { net } = netWorthKZT(accounts, debts, assets);
  const { transactions } = useFlow();
  const nowKey = new Date().toISOString().slice(0, 7);
  const [reorder, setReorder] = useState(false);

  const confirmSettle = (id: string) =>
    Alert.alert('Settle debt?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle', onPress: () => { settleDebt(id); showToast('Debt settled'); } },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ flex: 1, fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>Accounts</Text>
        <AmountText str={'net ≈ ' + fmt(fromKZT(net, base), base)} size={14} color={t.textMuted} weight="regular" />
        {accounts.length > 1 && (
          <Pressable onPress={() => setReorder(r => !r)} hitSlop={8} style={{
            width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
            backgroundColor: reorder ? t.accentSoft : t.surfaceSunken,
          }}>
            <Icon name="reorder" size={17} color={reorder ? t.accentDeep : t.textMuted} />
          </Pressable>
        )}
      </View>

      <Card>
        {accounts.length === 0 && (
          <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center', padding: 20 }}>
            No accounts yet — add your first card or wallet below.
          </Text>
        )}
        {accounts.map((a, i) => {
          const entries = Object.entries(a.balances) as [Currency, number][];
          const tot = entries.reduce((s, [c, v]) => s + toKZT(v, c), 0);
          const single = entries.length === 1 ? entries[0] : null;
          const flow = accountMonthFlowKZT(transactions, a.id, nowKey);
          const tint = typeTint(t, a.type);
          return (
            <Pressable
              key={a.id}
              onPress={() => !reorder && router.push({ pathname: '/account/[id]', params: { id: a.id } })}
              style={({ pressed }) => ({
                flexDirection: 'row', alignItems: 'center', gap: 12,
                paddingHorizontal: 14, paddingVertical: 13,
                borderBottomWidth: i < accounts.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
                backgroundColor: pressed && !reorder ? t.surfaceSunken : 'transparent',
                borderTopLeftRadius: i === 0 ? radius.lg : 0, borderTopRightRadius: i === 0 ? radius.lg : 0,
                borderBottomLeftRadius: i === accounts.length - 1 ? radius.lg : 0, borderBottomRightRadius: i === accounts.length - 1 ? radius.lg : 0,
              })}
            >
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
              {reorder ? (
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable hitSlop={6} disabled={i === 0} onPress={() => moveAccount(a.id, -1)} style={{
                    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: t.surfaceSunken, opacity: i === 0 ? 0.35 : 1,
                  }}>
                    <Icon name="arrowUp" size={15} color={t.textMuted} />
                  </Pressable>
                  <Pressable hitSlop={6} disabled={i === accounts.length - 1} onPress={() => moveAccount(a.id, 1)} style={{
                    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: t.surfaceSunken, opacity: i === accounts.length - 1 ? 0.35 : 1,
                  }}>
                    <Icon name="arrowDown" size={15} color={t.textMuted} />
                  </Pressable>
                </View>
              ) : (
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
              )}
            </Pressable>
          );
        })}
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

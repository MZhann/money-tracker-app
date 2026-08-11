import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, Icon } from '@/components/ui';
import { Currency, TYPE_LABELS, fmt, fromKZT, toKZT } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function Accounts() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, accounts } = useFlow();
  const base = settings.baseCurrency;
  const total = accounts.reduce((s, a) => s + Object.entries(a.balances).reduce((x, [c, v]) => x + toKZT(v as number, c as Currency), 0), 0);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: space(5), paddingBottom: 24, gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>Accounts</Text>
        <AmountText str={'≈ ' + fmt(fromKZT(total, base), base)} size={14} color={t.textMuted} weight="regular" />
      </View>

      {accounts.map(a => {
        const entries = Object.entries(a.balances) as [Currency, number][];
        const tot = entries.reduce((s, [c, v]) => s + toKZT(v, c), 0);
        const badge = a.type === 'credit'
          ? { bg: t.negativeSoft, fg: t.negative }
          : a.type === 'savings' ? { bg: t.transferSoft, fg: t.transfer } : { bg: t.surfaceSunken, fg: t.textMuted };
        return (
          <Card key={a.id} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontFamily: font.display, fontSize: 15, color: t.textBody }}>{a.name}</Text>
                <View style={{ backgroundColor: badge.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontFamily: font.body, fontSize: 11, color: badge.fg }}>{TYPE_LABELS[a.type]}</Text>
                </View>
              </View>
              <Pressable onPress={() => router.push({ pathname: '/sheets/edit-account', params: { id: a.id } })} hitSlop={8}
                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="pencil" size={15} color={t.textFaint} />
              </Pressable>
            </View>
            <View style={{ marginTop: 8, gap: 2 }}>
              {entries.map(([c, v]) => (
                <View key={c} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{c}</Text>
                  <AmountText str={fmt(v, c)} size={17} color={v < 0 ? t.negative : t.textBody} />
                </View>
              ))}
            </View>
            {entries.length > 1 && (
              <Text style={{ fontFamily: font.mono, fontSize: 11, color: t.textFaint, textAlign: 'right', marginTop: 6 }}>
                ≈ {fmt(fromKZT(tot, base), base)}
              </Text>
            )}
          </Card>
        );
      })}

      <Pressable onPress={() => router.push('/sheets/edit-account')} style={({ pressed }) => ({
        height: 52, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.borderStrong,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.99 : 1 }],
      })}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: t.textMuted }}>+ Add account</Text>
      </Pressable>
    </ScrollView>
  );
}

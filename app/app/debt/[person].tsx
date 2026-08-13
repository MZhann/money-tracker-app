import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmountText, Card, Icon } from '@/components/ui';
import { dateLabel, fmt, fromKZT, toKZT } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function DebtPerson() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { person = '' } = useLocalSearchParams<{ person: string }>();
  const { settings, debts, settleDebt, showToast } = useFlow();
  const base = settings.baseCurrency;

  const key = person.trim().toLowerCase();
  const entries = debts
    .filter(d => d.person.trim().toLowerCase() === key)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  let lent = 0, borrowed = 0;
  for (const d of entries) {
    const v = toKZT(d.amount, d.currency);
    if (d.dir === 'lent') lent += v; else borrowed += v;
  }
  const net = lent - borrowed;

  const confirmSettle = (id: string) =>
    Alert.alert('Settle this record?', 'It will be removed from the history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Settle', onPress: () => { settleDebt(id); showToast('Debt settled'); } },
    ]);

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: space(5), paddingBottom: 32, gap: space(3) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color={t.textMuted} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.display, fontSize: 22, color: t.textBody, letterSpacing: -0.4 }}>{person}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 11.5, color: t.textFaint }}>
            {net > 0 ? 'owes you' : net < 0 ? 'you owe them' : 'settled up'}
          </Text>
        </View>
        <Pressable onPress={() => router.push({ pathname: '/sheets/add-debt', params: { person } })} style={({ pressed }) => ({
          height: 32, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: t.accentSoft,
          alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.97 : 1 }],
        })}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: t.accentDeep }}>+ Add</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {[
          { label: 'Lent', val: lent, color: t.positive, sign: '+' },
          { label: 'Borrowed', val: borrowed, color: t.negative, sign: '−' },
          { label: 'Net', val: net, color: net >= 0 ? t.positive : t.negative, sign: net >= 0 ? '+' : '−' },
        ].map(s => (
          <Card key={s.label} style={{ flex: 1, padding: 12 }}>
            <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{s.label}</Text>
            <AmountText str={`${s.val === 0 ? '' : s.sign}${fmt(fromKZT(Math.abs(s.val), base), base, false)}`} size={14} color={s.val === 0 ? t.textBody : s.color} />
          </Card>
        ))}
      </View>

      {entries.length === 0 ? (
        <Text style={{ fontFamily: font.body, fontSize: 13, color: t.textFaint, textAlign: 'center', paddingVertical: 32 }}>
          All settled up — no records with {person.trim() || 'this person'}.
        </Text>
      ) : (
        <Card>
          {entries.map((d, i) => (
            <View key={d.id} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
              borderBottomWidth: i < entries.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: t.textBody }}>
                  {d.dir === 'lent' ? 'You lent' : 'You borrowed'}
                </Text>
                <Text numberOfLines={2} style={{ fontFamily: font.body, fontSize: 11.5, color: t.textFaint }}>
                  {d.date ? dateLabel(d.date) : 'earlier'}{d.note ? ` · ${d.note}` : ''}
                </Text>
              </View>
              <AmountText
                str={`${d.dir === 'lent' ? '+' : '−'}${fmt(d.amount, d.currency, false)}`}
                size={14} color={d.dir === 'lent' ? t.positive : t.negative}
              />
              <Pressable onPress={() => confirmSettle(d.id)} style={{ height: 28, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: t.surfaceSunken, justifyContent: 'center' }}>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textMuted }}>Settle</Text>
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

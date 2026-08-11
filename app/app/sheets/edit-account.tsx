import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CapsLabel, Chip, Icon } from '@/components/ui';
import { AccountType, CURRENCIES, Currency, TYPE_LABELS, uuid } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function EditAccount() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, saveAccount, deleteAccount, showToast } = useFlow();
  const existing = accounts.find(a => a.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<AccountType>(existing?.type ?? 'debit');
  const [bals, setBals] = useState<{ cur: Currency; amt: string }[]>(
    existing ? (Object.entries(existing.balances) as [Currency, number][]).map(([cur, v]) => ({ cur, amt: String(v) })) : [{ cur: 'KZT', amt: '' }]
  );
  const unused = CURRENCIES.filter(c => !bals.some(b => b.cur === c));

  const save = () => {
    if (!name.trim()) return showToast('Give the account a name');
    const balances: Partial<Record<Currency, number>> = {};
    for (const b of bals) {
      const v = parseFloat(b.amt.replace(',', '.').replace('−', '-'));
      balances[b.cur] = isNaN(v) ? 0 : v;
    }
    saveAccount({ id: existing?.id ?? uuid(), name: name.trim(), type, balances });
    showToast(existing ? 'Account updated' : 'Account created');
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert('Delete this account?', 'Its transactions stay in history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteAccount(existing!.id); showToast('Account deleted'); router.back(); } },
    ]);

  return (
    <ScrollView style={{ backgroundColor: t.surfaceCard }} contentContainerStyle={{ padding: space(5), paddingBottom: 44, gap: space(4) }}>
      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>{existing ? 'Edit account' : 'New account'}</Text>

      <TextInput
        value={name} onChangeText={setName} placeholder="Account name" placeholderTextColor={t.textFaint}
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 15, color: t.textBody }}
      />

      <View style={{ gap: 8 }}>
        <CapsLabel>Type</CapsLabel>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {(Object.keys(TYPE_LABELS) as AccountType[]).map(ty => (
            <Chip key={ty} label={TYPE_LABELS[ty]} selected={type === ty} onPress={() => setType(ty)} />
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <CapsLabel>Balances</CapsLabel>
        {bals.map((b, i) => (
          <View key={b.cur} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={{ width: 48, fontFamily: font.mono, fontSize: 13, color: t.textMuted }}>{b.cur}</Text>
            <TextInput
              value={b.amt} keyboardType="numbers-and-punctuation" placeholder="0" placeholderTextColor={t.textFaint}
              onChangeText={v => setBals(bals.map((x, j) => j === i ? { ...x, amt: v.replace(/[^\d.,\-−]/g, '') } : x))}
              style={{ flex: 1, borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 10, backgroundColor: t.surfaceRaised, fontFamily: font.mono, fontSize: 14, color: t.textBody }}
            />
            <Pressable hitSlop={8} onPress={() => bals.length > 1 ? setBals(bals.filter((_, j) => j !== i)) : showToast('An account needs at least one currency')}
              style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={13} color={t.textFaint} stroke={2} />
            </Pressable>
          </View>
        ))}
        {unused.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>Add currency:</Text>
            {unused.map(c => (
              <Pressable key={c} onPress={() => setBals([...bals, { cur: c, amt: '' }])}
                style={{ height: 30, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: t.surfaceSunken, justifyContent: 'center' }}>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textMuted }}>+ {c}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>
          Multi-currency cards (like a Super Card) hold several balances — add each currency above.
        </Text>
      </View>

      <Pressable onPress={save} style={({ pressed }) => ({
        height: 52, borderRadius: radius.pill, backgroundColor: pressed ? t.accentDeep : t.accent,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 16, color: t.onAccent }}>{existing ? 'Save changes' : 'Create account'}</Text>
      </Pressable>
      {existing && (
        <Pressable onPress={confirmDelete} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: t.negative }}>Delete account</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

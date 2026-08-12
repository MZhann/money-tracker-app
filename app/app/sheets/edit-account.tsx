import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CapsLabel, Icon, Select, currencyOptions } from '@/components/ui';
import { AccountType, CURRENCIES, Currency, TYPE_LABELS, uuid } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TYPE_ICON: Record<AccountType, string> = { debit: 'wallet', credit: 'card', cash: 'banknote', savings: 'trend' };
const TYPE_HINT: Record<AccountType, string> = {
  debit: 'Everyday card — your own money.',
  credit: 'Credit line — you spend the bank’s money and owe it back.',
  cash: 'Physical wallet money.',
  savings: 'Deposit or savings — money set aside.',
};

export default function EditAccount() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { accounts, saveAccount, deleteAccount, showToast } = useFlow();
  const existing = accounts.find(a => a.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<AccountType>(existing?.type ?? 'debit');
  const [bals, setBals] = useState<{ cur: Currency; amt: string }[]>(
    existing
      ? (Object.entries(existing.balances) as [Currency, number][]).map(([cur, v]) =>
          ({ cur, amt: String(existing.type === 'credit' ? Math.abs(v) : v) }))
      : [{ cur: 'KZT', amt: '' }]
  );
  const [limits, setLimits] = useState<Partial<Record<Currency, string>>>(
    existing?.limits
      ? Object.fromEntries(Object.entries(existing.limits).map(([c, v]) => [c, String(v)]))
      : {}
  );
  const isCredit = type === 'credit';
  const unused = CURRENCIES.filter(c => !bals.some(b => b.cur === c));

  const save = () => {
    if (!name.trim()) return showToast('Give the account a name');
    const balances: Partial<Record<Currency, number>> = {};
    for (const b of bals) {
      const v = parseFloat(b.amt.replace(',', '.').replace('−', '-'));
      // Credit: the field is "you owe", stored negative so it counts as a liability.
      balances[b.cur] = isNaN(v) ? 0 : isCredit ? -Math.abs(v) : v;
    }
    let limitsOut: Partial<Record<Currency, number>> | undefined;
    if (isCredit) {
      for (const b of bals) {
        const v = parseFloat((limits[b.cur] ?? '').replace(',', '.'));
        if (!isNaN(v) && v > 0) limitsOut = { ...limitsOut, [b.cur]: v };
      }
    }
    saveAccount({ id: existing?.id ?? uuid(), name: name.trim(), type, balances, limits: limitsOut, order: existing?.order });
    showToast(existing ? 'Account updated' : 'Account created');
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert('Delete this account?', 'Its transactions stay in history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteAccount(existing!.id); showToast('Account deleted'); router.back(); } },
    ]);

  return (
    <ScrollView
      style={{ backgroundColor: t.surfaceCard }}
      contentContainerStyle={{ padding: space(5), paddingBottom: 44, gap: space(4) }}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>{existing ? 'Edit account' : 'New account'}</Text>

      <View style={{ gap: 8 }}>
        <CapsLabel>Name</CapsLabel>
        <TextInput
          value={name} onChangeText={setName} placeholder="Kaspi Gold, Cash, Deposit…" placeholderTextColor={t.textFaint}
          style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 15, color: t.textBody }}
        />
      </View>

      <View style={{ gap: 8 }}>
        <CapsLabel>Type</CapsLabel>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(Object.keys(TYPE_LABELS) as AccountType[]).map(ty => {
            const sel = type === ty;
            return (
              <Pressable key={ty} onPress={() => setType(ty)} style={({ pressed }) => ({
                flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.md,
                borderWidth: 1.5, borderColor: sel ? t.accent : t.borderSoft,
                backgroundColor: sel ? t.accentSoft : t.surfaceRaised,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}>
                <Icon name={TYPE_ICON[ty]} size={20} color={sel ? t.accentDeep : t.textMuted} />
                <Text style={{ fontFamily: sel ? font.bodySemiBold : font.body, fontSize: 11.5, color: sel ? t.accentDeep : t.textMuted }}>
                  {TYPE_LABELS[ty]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>{TYPE_HINT[type]}</Text>
      </View>

      <View style={{ gap: 8 }}>
        <CapsLabel>{isCredit ? 'You owe' : 'Balances'}</CapsLabel>
        {bals.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ width: 118 }}>
              <Select
                value={b.cur}
                options={currencyOptions([b.cur, ...unused])}
                onChange={cur => setBals(bals.map((x, j) => j === i ? { ...x, cur } : x))}
              />
            </View>
            <TextInput
              value={b.amt} keyboardType="numbers-and-punctuation" placeholder="0" placeholderTextColor={t.textFaint}
              onChangeText={v => setBals(bals.map((x, j) => j === i ? { ...x, amt: v.replace(/[^\d.,\-−]/g, '') } : x))}
              style={{ flex: 1, height: 46, borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: t.surfaceRaised, fontFamily: font.mono, fontSize: 14, color: t.textBody }}
            />
            {bals.length > 1 && (
              <Pressable hitSlop={8} onPress={() => setBals(bals.filter((_, j) => j !== i))}
                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="x" size={13} color={t.textFaint} stroke={2} />
              </Pressable>
            )}
          </View>
        ))}
        {unused.length > 0 && (
          <Pressable onPress={() => setBals([...bals, { cur: unused[0], amt: '' }])} style={({ pressed }) => ({
            height: 42, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.borderStrong,
            alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.99 : 1 }],
          })}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 12.5, color: t.textMuted }}>+ Add another currency</Text>
          </Pressable>
        )}
        <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>
          {isCredit
            ? 'Enter how much of the credit line you have spent — it counts as a debt, not as your money.'
            : 'Multi-currency cards (like a Super Card) hold several balances — add each currency above.'}
        </Text>
      </View>

      {isCredit && (
        <View style={{ gap: 8 }}>
          <CapsLabel>Credit limit (optional)</CapsLabel>
          {bals.map((b, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Text style={{ width: 118, fontFamily: font.mono, fontSize: 13, color: t.textMuted, paddingLeft: 12 }}>{b.cur}</Text>
              <TextInput
                value={limits[b.cur] ?? ''} keyboardType="numbers-and-punctuation" placeholder="0" placeholderTextColor={t.textFaint}
                onChangeText={v => setLimits({ ...limits, [b.cur]: v.replace(/[^\d.,]/g, '') })}
                style={{ flex: 1, height: 46, borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, paddingHorizontal: 12, backgroundColor: t.surfaceRaised, fontFamily: font.mono, fontSize: 14, color: t.textBody }}
              />
            </View>
          ))}
          <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>
            Only for showing available credit — the bank's money is never counted in your net worth.
          </Text>
        </View>
      )}

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

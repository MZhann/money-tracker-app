import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip, Segmented } from '@/components/ui';
import { Currency } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function AddDebt() {
  const t = useTheme();
  const router = useRouter();
  const { addDebt, showToast, settings } = useFlow();
  const [dir, setDir] = useState<'lent' | 'borrowed'>('lent');
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>(settings.baseCurrency);

  const save = () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!person.trim()) return showToast('Who is this debt with?');
    if (!amt || amt <= 0) return showToast('Enter an amount');
    addDebt({ person: person.trim(), dir, amount: amt, currency });
    showToast('Debt saved');
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: t.surfaceCard }} contentContainerStyle={{ padding: space(5), paddingBottom: 44, gap: space(3) }}>
      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>Add debt</Text>
      <Segmented
        options={[{ value: 'lent', label: 'I lent money' }, { value: 'borrowed', label: 'I borrowed' }]}
        value={dir} onChange={setDir}
      />
      <TextInput
        value={person} onChangeText={setPerson} placeholder="Who?" placeholderTextColor={t.textFaint}
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 15, color: t.textBody }}
      />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TextInput
          value={amount} onChangeText={v => setAmount(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad"
          placeholder="Amount" placeholderTextColor={t.textFaint}
          style={{ flex: 1, borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.mono, fontSize: 14, color: t.textBody }}
        />
        {(['KZT', 'USD'] as Currency[]).map(c => (
          <Chip key={c} label={c} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </View>
      <Pressable onPress={save} style={({ pressed }) => ({
        height: 52, borderRadius: radius.pill, backgroundColor: pressed ? t.accentDeep : t.accent,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }], marginTop: 6,
      })}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 16, color: t.onAccent }}>Save debt</Text>
      </Pressable>
    </ScrollView>
  );
}

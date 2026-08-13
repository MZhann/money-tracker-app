import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CapsLabel, Chip, CurrencyPicker, DateField, Segmented } from '@/components/ui';
import { Currency, todayISO } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function AddDebt() {
  const t = useTheme();
  const router = useRouter();
  const { person: preset } = useLocalSearchParams<{ person?: string }>();
  const { debts, addDebt, showToast, settings } = useFlow();

  // Unique existing debtors, first-seen casing.
  const people = debts.reduce<string[]>((acc, d) => {
    const name = d.person.trim();
    if (name && !acc.some(p => p.toLowerCase() === name.toLowerCase())) acc.push(name);
    return acc;
  }, []);

  const [dir, setDir] = useState<'lent' | 'borrowed'>('lent');
  const [person, setPerson] = useState(preset?.trim() ?? '');
  const [isNew, setIsNew] = useState(!preset && people.length === 0);
  const [newName, setNewName] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [currency, setCurrency] = useState<Currency>(settings.baseCurrency);
  const [date, setDate] = useState(todayISO());

  const save = () => {
    const who = (isNew ? newName : person).trim();
    const amt = parseFloat(amount.replace(',', '.'));
    if (!who) return showToast(isNew ? 'Give this person a name' : 'Who is this debt with?');
    if (!amt || amt <= 0) return showToast('Enter an amount');
    addDebt({ person: who, dir, amount: amt, currency, date, note: note.trim() || undefined });
    showToast('Debt saved');
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: t.surfaceCard }} contentContainerStyle={{ padding: space(5), paddingBottom: 44, gap: space(3) }}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>Add debt</Text>
      <Segmented
        options={[{ value: 'lent', label: 'I lent money' }, { value: 'borrowed', label: 'I borrowed' }]}
        value={dir} onChange={setDir}
      />
      <CapsLabel>Who</CapsLabel>
      {people.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {people.map(p => (
            <Chip key={p} label={p} selected={!isNew && person.toLowerCase() === p.toLowerCase()} onPress={() => { setPerson(p); setIsNew(false); }} />
          ))}
          <Chip label="+ New person" selected={isNew} onPress={() => setIsNew(true)} />
        </View>
      )}
      {isNew && (
        <TextInput
          value={newName} onChangeText={setNewName} placeholder="Name" placeholderTextColor={t.textFaint}
          style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 15, color: t.textBody }}
        />
      )}
      <TextInput
        value={amount} onChangeText={v => setAmount(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad"
        placeholder="Amount" placeholderTextColor={t.textFaint}
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.mono, fontSize: 14, color: t.textBody }}
      />
      <CurrencyPicker value={currency} onChange={setCurrency} />
      <TextInput
        value={note} onChangeText={setNote} placeholder="Note — what was it for? (optional)" placeholderTextColor={t.textFaint}
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 15, color: t.textBody }}
      />
      <CapsLabel>When</CapsLabel>
      <DateField value={date} onChange={setDate} />
      <Pressable onPress={save} style={({ pressed }) => ({
        height: 52, borderRadius: radius.pill, backgroundColor: pressed ? t.accentDeep : t.accent,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }], marginTop: 6,
      })}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 16, color: t.onAccent }}>Save debt</Text>
      </Pressable>
    </ScrollView>
  );
}

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CapsLabel, CategoryIcon, Chip, Segmented } from '@/components/ui';
import { CURRENCIES, Currency, SYM, TxType, todayISO } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { catTint } from '@/components/ui';

export default function AddTransaction() {
  const t = useTheme();
  const router = useRouter();
  const { accounts, categories, addTx, showToast } = useFlow();

  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>((Object.keys(accounts[0]?.balances ?? { KZT: 0 })[0] as Currency) ?? 'KZT');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());

  const typeColor = { expense: t.negative, income: t.positive, transfer: t.transfer }[type];
  const account = accounts.find(a => a.id === accountId);
  const accCurs = Object.keys(account?.balances ?? {}) as Currency[];
  const curList = [...new Set([...accCurs, ...CURRENCIES])];
  const cats = categories.filter(c => c.kind === type);

  const save = () => {
    const amt = parseFloat(amount.replace(',', '.'));
    if (!amt || amt <= 0) return showToast('Enter an amount first');
    if (!accountId) return showToast('Pick an account');
    if (type === 'transfer' && !toId) return showToast('Pick a destination account');
    if (type !== 'transfer' && !categoryId) return showToast('Pick a category');
    addTx({ type, amount: amt, currency, accountId, toId: type === 'transfer' ? toId : null, categoryId: type === 'transfer' ? null : categoryId, note: note.trim(), date });
    showToast(type === 'transfer' ? 'Transfer complete — money moved between your accounts' : type === 'expense' ? 'Expense added' : 'Income added');
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: t.surfaceCard }} contentContainerStyle={{ padding: space(5), paddingBottom: 44, gap: space(4) }}>
      <Segmented
        tint
        options={[
          { value: 'expense', label: 'Expense', color: t.negative },
          { value: 'income', label: 'Income', color: t.positive },
          { value: 'transfer', label: 'Transfer', color: t.transfer },
        ]}
        value={type}
        onChange={v => { setType(v); setCategoryId(null); }}
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
        <TextInput
          value={amount} onChangeText={v => setAmount(v.replace(/[^\d.,]/g, ''))}
          placeholder="0" placeholderTextColor={t.textFaint} keyboardType="decimal-pad"
          style={{ fontFamily: font.monoMedium, fontSize: 42, color: typeColor, textAlign: 'right', minWidth: 120, padding: 0 }}
        />
        <Text style={{ fontFamily: font.mono, fontSize: 24, color: t.textFaint }}>{SYM[currency]}</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {curList.map(c => (
          <Chip key={c} label={accCurs.includes(c) ? c : `${c} +`} selected={currency === c} onPress={() => setCurrency(c)} />
        ))}
      </View>

      <View style={{ gap: 8 }}>
        <CapsLabel>{type === 'income' ? 'To account' : 'From account'}</CapsLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {accounts.map(a => (
            <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => {
              setAccountId(a.id);
              const curs = Object.keys(a.balances) as Currency[];
              if (!curs.includes(currency)) setCurrency(curs[0] ?? 'KZT');
            }} />
          ))}
        </ScrollView>
      </View>

      {type === 'transfer' && (
        <View style={{ gap: 8 }}>
          <CapsLabel>To account</CapsLabel>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {accounts.filter(a => a.id !== accountId).map(a => (
              <Chip key={a.id} label={a.name} selected={toId === a.id} onPress={() => setToId(a.id)} />
            ))}
          </ScrollView>
        </View>
      )}

      {type !== 'transfer' && (
        <View style={{ gap: 10 }}>
          <CapsLabel>Category</CapsLabel>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cats.map(c => {
              const sel = categoryId === c.id;
              const tint = catTint(t, c.color);
              return (
                <Pressable key={c.id} onPress={() => setCategoryId(c.id)} style={({ pressed }) => ({
                  width: '25%', alignItems: 'center', gap: 5, paddingVertical: 8, transform: [{ scale: pressed ? 0.95 : 1 }],
                })}>
                  <View style={{ borderRadius: 26, borderWidth: 2, borderColor: sel ? tint.fg : 'transparent', padding: 2 }}>
                    <CategoryIcon icon={c.icon} color={c.color} size={44} />
                  </View>
                  <Text numberOfLines={1} style={{ fontFamily: sel ? font.bodySemiBold : font.body, fontSize: 10.5, color: sel ? t.textBody : t.textMuted }}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <TextInput
          value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={t.textFaint}
          style={{ flex: 1, borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 14, color: t.textBody }}
        />
        <TextInput
          value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={t.textFaint}
          style={{ width: 132, borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 13, color: t.textMuted }}
        />
        {/* Swap the date TextInput for @react-native-community/datetimepicker for a native picker. */}
      </View>

      <Pressable onPress={save} style={({ pressed }) => ({
        height: 52, borderRadius: radius.pill, backgroundColor: typeColor,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 16, color: t.onAccent }}>
          {type === 'expense' ? 'Add expense' : type === 'income' ? 'Add income' : 'Move money'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

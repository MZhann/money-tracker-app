import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CapsLabel, CategoryIcon, Chip, DateField, Icon, Segmented, Select, currencyOptions } from '@/components/ui';
import { CURRENCIES, Currency, TxType, todayISO } from '@/lib/money';
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
  const cats = categories.filter(c => c.kind === type);

  // Collapsed grid: 7 categories + the "New" tile = two rows of four.
  const COLLAPSED = 7;
  const [showAllCats, setShowAllCats] = useState(false);
  const visibleCats = showAllCats ? cats : cats.slice(0, COLLAPSED);

  // A category created from the "New" tile comes back appended — select it right away.
  const catCount = useRef(categories.length);
  useEffect(() => {
    if (categories.length > catCount.current) {
      const added = categories[categories.length - 1];
      if (added.kind === type) {
        setCategoryId(added.id);
        if (cats.findIndex(c => c.id === added.id) >= COLLAPSED) setShowAllCats(true);
      }
    }
    catCount.current = categories.length;
  }, [categories]);

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
    <View style={{ flex: 1, backgroundColor: t.surfaceCard }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: space(5), paddingBottom: 16, gap: space(4) }}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled"
    >
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

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 8 }}>
        <TextInput
          value={amount} onChangeText={v => setAmount(v.replace(/[^\d.,]/g, ''))}
          placeholder="0" placeholderTextColor={t.textFaint} keyboardType="decimal-pad"
          style={{ fontFamily: font.monoMedium, fontSize: 42, color: typeColor, textAlign: 'right', minWidth: 120, padding: 0 }}
        />
        {/* Currency follows the account; the small dropdown covers the rare multi-currency case. */}
        <Select
          variant="bare" value={currency} onChange={setCurrency}
          options={currencyOptions([...new Set([...accCurs, ...CURRENCIES])])}
        />
      </View>

      <View style={{ gap: 8 }}>
        <CapsLabel>{type === 'income' ? 'To account' : 'From account'}</CapsLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {accounts.map(a => (
            <Chip key={a.id} label={a.name} selected={accountId === a.id} onPress={() => {
              setAccountId(a.id);
              const curs = Object.keys(a.balances) as Currency[];
              setCurrency(curs.includes(currency) ? currency : curs[0] ?? 'KZT');
            }} />
          ))}
        </ScrollView>
      </View>

      {/* Type-dependent slot with a constant minHeight, so Date and Note below never move. */}
      <View style={{ minHeight: 208 }}>
        {type === 'transfer' ? (
          <View style={{ gap: 8 }}>
            <CapsLabel>To account</CapsLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {accounts.filter(a => a.id !== accountId).map(a => (
                <Chip key={a.id} label={a.name} selected={toId === a.id} onPress={() => setToId(a.id)} />
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <CapsLabel>Category</CapsLabel>
              {cats.length > COLLAPSED && (
                <Pressable hitSlop={8} onPress={() => setShowAllCats(s => !s)} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: t.accentDeep }}>
                    {showAllCats ? 'Show less' : `Show all (${cats.length})`}
                  </Text>
                  <Icon name={showAllCats ? 'arrowUp' : 'chevronDown'} size={13} color={t.accentDeep} stroke={2} />
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {visibleCats.map(c => {
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
              <Pressable onPress={() => router.push({ pathname: '/sheets/add-category', params: { kind: type } })}
                style={({ pressed }) => ({
                  width: '25%', alignItems: 'center', gap: 5, paddingVertical: 8, transform: [{ scale: pressed ? 0.95 : 1 }],
                })}>
                <View style={{ padding: 2, borderRadius: 26, borderWidth: 2, borderColor: 'transparent' }}>
                  <View style={{
                    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                    borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.borderStrong, backgroundColor: t.surfaceRaised,
                  }}>
                    <Icon name="plus" size={18} color={t.textMuted} />
                  </View>
                </View>
                <Text style={{ fontFamily: font.body, fontSize: 10.5, color: t.textMuted }}>New</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <View style={{ gap: 8 }}>
        <CapsLabel>Date</CapsLabel>
        <DateField value={date} onChange={setDate} />
      </View>

      <TextInput
        value={note} onChangeText={setNote} placeholder="Note (optional)" placeholderTextColor={t.textFaint}
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 14, color: t.textBody }}
      />
    </ScrollView>

    <View style={{ padding: space(5), paddingTop: 12, paddingBottom: 28, borderTopWidth: 1, borderTopColor: t.borderSoft, backgroundColor: t.surfaceCard }}>
      <Pressable onPress={save} style={({ pressed }) => ({
        height: 52, borderRadius: radius.pill, backgroundColor: typeColor,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 16, color: t.onAccent }}>
          {type === 'expense' ? 'Add expense' : type === 'income' ? 'Add income' : 'Move money'}
        </Text>
      </Pressable>
    </View>
    </View>
  );
}

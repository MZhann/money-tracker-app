import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CurrencyPicker } from '@/components/ui';
import { Currency, uuid } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

export default function EditAsset() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { assets, saveAsset, deleteAsset, showToast, settings } = useFlow();
  const existing = assets.find(a => a.id === id);

  const [name, setName] = useState(existing?.name ?? '');
  const [value, setValue] = useState(existing ? String(existing.value) : '');
  const [currency, setCurrency] = useState<Currency>(existing?.currency ?? settings.baseCurrency);

  const save = () => {
    const v = parseFloat(value.replace(',', '.'));
    if (!name.trim()) return showToast('Name the item first');
    if (!v || v <= 0) return showToast('Enter what it is worth');
    saveAsset({ id: existing?.id ?? uuid(), name: name.trim(), value: v, currency });
    showToast(existing ? 'Property updated' : 'Property added');
    router.back();
  };

  const confirmDelete = () =>
    Alert.alert('Remove this item?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => { deleteAsset(existing!.id); showToast('Property removed'); router.back(); } },
    ]);

  return (
    <ScrollView style={{ backgroundColor: t.surfaceCard }} contentContainerStyle={{ padding: space(5), paddingBottom: 44, gap: space(3) }}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
      <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>{existing ? 'Edit property' : 'Add property'}</Text>
      <TextInput
        value={name} onChangeText={setName} placeholder="What is it? (PS5, iPhone, home…)" placeholderTextColor={t.textFaint}
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 15, color: t.textBody }}
      />
      <TextInput
        value={value} onChangeText={v => setValue(v.replace(/[^\d.,]/g, ''))} keyboardType="decimal-pad"
        placeholder="Value today" placeholderTextColor={t.textFaint}
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.mono, fontSize: 14, color: t.textBody }}
      />
      <CurrencyPicker value={currency} onChange={setCurrency} />
      <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>
        Use what it would sell for today, not what you paid — that keeps your net worth honest.
      </Text>
      <Pressable onPress={save} style={({ pressed }) => ({
        height: 52, borderRadius: radius.pill, backgroundColor: pressed ? t.accentDeep : t.accent,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }], marginTop: 6,
      })}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 16, color: t.onAccent }}>{existing ? 'Save changes' : 'Add to net worth'}</Text>
      </Pressable>
      {existing && (
        <Pressable onPress={confirmDelete} style={{ height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: t.negative }}>Remove property</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

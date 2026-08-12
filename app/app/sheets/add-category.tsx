import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { CapsLabel, CategoryIcon, Icon, Segmented, catTint } from '@/components/ui';
import { CAT_COLORS, CatColor } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const CAT_ICONS = [
  'cart', 'dining', 'coffee', 'pizza', 'beer', 'cake',
  'car', 'bus', 'train', 'plane', 'bike', 'fuel',
  'home', 'sofa', 'plant', 'wrench', 'bolt', 'droplet',
  'flame', 'wifi', 'phone', 'tshirt', 'bag', 'scissors',
  'health', 'pill', 'dumbbell', 'paw', 'film', 'music',
  'gamepad', 'camera', 'book', 'education', 'briefcase', 'laptop',
  'gift', 'star', 'umbrella', 'globe', 'banknote', 'wallet',
  'card', 'trend', 'repeat', 'chart', 'sparkle',
];

export default function AddCategory() {
  const t = useTheme();
  const router = useRouter();
  const { kind: kindParam } = useLocalSearchParams<{ kind?: string }>();
  const { addCategory, showToast } = useFlow();

  const [name, setName] = useState('');
  const [kind, setKind] = useState<'expense' | 'income'>(kindParam === 'income' ? 'income' : 'expense');
  const [icon, setIcon] = useState('cart');
  const [color, setColor] = useState<CatColor>('moss');

  const save = () => {
    if (!name.trim()) return showToast('Name the category first');
    addCategory({ name: name.trim(), kind, icon, color });
    showToast('Category added');
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: t.surfaceCard }} contentContainerStyle={{ padding: space(5), paddingBottom: 44, gap: space(4) }}
      automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <CategoryIcon icon={icon} color={color} size={44} />
        <Text style={{ fontFamily: font.display, fontSize: 18, color: t.textBody }}>New category</Text>
      </View>

      <Segmented
        options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
        value={kind} onChange={setKind}
      />

      <TextInput
        value={name} onChangeText={setName} placeholder="Category name" placeholderTextColor={t.textFaint} autoFocus
        style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 12, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 15, color: t.textBody }}
      />

      <View style={{ gap: 8 }}>
        <CapsLabel>Icon</CapsLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CAT_ICONS.map(ic => (
            <Pressable key={ic} onPress={() => setIcon(ic)} style={{
              width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
              backgroundColor: icon === ic ? t.accentSoft : t.surfaceSunken,
              borderWidth: 1.5, borderColor: icon === ic ? t.accent : 'transparent',
            }}>
              <Icon name={ic} size={19} color={icon === ic ? t.accentDeep : t.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <CapsLabel>Color</CapsLabel>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {CAT_COLORS.map(c => {
            const tint = catTint(t, c);
            return (
              <Pressable key={c} onPress={() => setColor(c)} style={{
                width: 40, height: 40, borderRadius: 20, backgroundColor: tint.bg,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: color === c ? tint.fg : 'transparent',
              }}>
                <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: tint.fg }} />
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable onPress={save} style={({ pressed }) => ({
        height: 52, borderRadius: radius.pill, backgroundColor: pressed ? t.accentDeep : t.accent,
        alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }],
      })}>
        <Text style={{ fontFamily: font.bodySemiBold, fontSize: 16, color: t.onAccent }}>Create category</Text>
      </Pressable>
    </ScrollView>
  );
}

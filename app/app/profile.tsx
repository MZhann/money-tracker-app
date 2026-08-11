import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CapsLabel, Card, CategoryIcon, Chip, Icon, catTint } from '@/components/ui';
import { exportMarkdown } from '@/export/markdown';
import { CURRENCIES, CatColor, SYM } from '@/lib/money';
import { useFlow } from '@/store/useFlow';
import { THEMES, ThemeId, font, radius, space } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const THEME_LIST: { id: ThemeId; name: string }[] = [
  { id: '', name: 'Paper' }, { id: 'mountain', name: 'Mountain' }, { id: 'ocean', name: 'Ocean' },
  { id: 'desert', name: 'Desert' }, { id: 'forest', name: 'Forest' }, { id: 'arctic', name: 'Arctic' }, { id: 'night', name: 'Night' },
];
const CAT_ICONS = ['cart', 'coffee', 'car', 'bag', 'health', 'film', 'gift', 'trend'];
const CAT_COLORS: CatColor[] = ['moss', 'clay', 'lake', 'sun'];

export default function Profile() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, accounts, categories, transactions, debts, setSettings, addCategory, deleteCategory, resetToSample, showToast } = useFlow();
  const initials = settings.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const [catsOpen, setCatsOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catKind, setCatKind] = useState<'expense' | 'income'>('expense');
  const [catColor, setCatColor] = useState<CatColor>('moss');
  const [catIcon, setCatIcon] = useState('cart');

  const addCat = () => {
    if (!catName.trim()) return showToast('Name the category first');
    addCategory({ name: catName.trim(), kind: catKind, color: catColor, icon: catIcon });
    setCatName('');
    showToast('Category added');
  };

  const onExport = async () => {
    try { await exportMarkdown(settings, accounts, categories, transactions, debts); showToast('Markdown ready'); }
    catch { showToast("Couldn't export right now"); }
  };

  const chipList = (kind: 'expense' | 'income') => categories.filter(c => c.kind === kind).map(c => {
    const tint = catTint(t, c.color);
    return (
      <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: tint.bg, borderRadius: radius.pill, paddingVertical: 6, paddingLeft: 10, paddingRight: 6 }}>
        <Text style={{ fontFamily: font.body, fontSize: 13, color: tint.fg }}>{c.name}</Text>
        <Pressable hitSlop={6} onPress={() => { deleteCategory(c.id); showToast('Category removed'); }}>
          <Icon name="x" size={11} color={tint.fg} stroke={2.2} />
        </Pressable>
      </View>
    );
  });

  return (
    <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: space(5), paddingBottom: 32, gap: space(4) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevronLeft" size={20} color={t.textMuted} />
        </Pressable>
        <Text style={{ fontFamily: font.display, fontSize: 26, color: t.textBody, letterSpacing: -0.5 }}>Profile</Text>
      </View>

      <Card style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: t.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: font.display, fontSize: 18, color: t.accentDeep }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>Your name</Text>
          <TextInput value={settings.name} onChangeText={v => setSettings({ name: v })}
            style={{ fontFamily: font.bodyMedium, fontSize: 16, color: t.textBody, padding: 0 }} />
        </View>
      </Card>

      <Card style={{ padding: 16, gap: 10 }}>
        <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody }}>Main currency</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {CURRENCIES.map(c => (
            <Chip key={c} label={`${SYM[c]} ${c}`} selected={settings.baseCurrency === c}
              onPress={() => { setSettings({ baseCurrency: c }); showToast(`Totals now in ${c}`); }} />
          ))}
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>Totals and charts are shown in this currency.</Text>
      </Card>

      <Card style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody }}>Theme</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {THEME_LIST.map(th => {
            const p = THEMES[th.id];
            const sel = settings.theme === th.id;
            return (
              <Pressable key={th.id} onPress={() => { setSettings({ theme: th.id }); showToast(th.id ? `${th.name} theme on` : 'Back to paper'); }}
                style={({ pressed }) => ({ width: '25%', alignItems: 'center', gap: 6, paddingVertical: 8, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.heroA, borderWidth: 2, borderColor: sel ? t.accent : 'transparent', overflow: 'hidden' }}>
                  <View style={{ position: 'absolute', right: -8, bottom: -8, width: 36, height: 36, borderRadius: 18, backgroundColor: p.heroB }} />
                </View>
                <Text style={{ fontFamily: font.body, fontSize: 11, color: sel ? t.textBody : t.textFaint }}>{th.name}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ padding: 16, gap: 12 }}>
        <Pressable onPress={() => setCatsOpen(!catsOpen)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody }}>Categories</Text>
          <Icon name={catsOpen ? 'chevronDown' : 'chevronRight'} size={16} color={t.textFaint} />
        </Pressable>
        {catsOpen && (
          <View style={{ gap: 12 }}>
            <CapsLabel>Expenses</CapsLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{chipList('expense')}</View>
            <CapsLabel>Income</CapsLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{chipList('income')}</View>
            <View style={{ borderTopWidth: 1, borderTopColor: t.borderSoft, paddingTop: 12, gap: 10 }}>
              <TextInput value={catName} onChangeText={setCatName} placeholder="New category name" placeholderTextColor={t.textFaint}
                style={{ borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, padding: 10, backgroundColor: t.surfaceRaised, fontFamily: font.body, fontSize: 14, color: t.textBody }} />
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="Expense" selected={catKind === 'expense'} onPress={() => setCatKind('expense')} />
                <Chip label="Income" selected={catKind === 'income'} onPress={() => setCatKind('income')} />
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {CAT_COLORS.map(k => {
                  const tint = catTint(t, k);
                  return (
                    <Pressable key={k} onPress={() => setCatColor(k)}
                      style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: tint.fg, borderWidth: 2, borderColor: catColor === k ? t.textFaint : 'transparent' }} />
                  );
                })}
                <View style={{ width: 1, height: 20, backgroundColor: t.borderSoft }} />
                {CAT_ICONS.map(ic => (
                  <Pressable key={ic} onPress={() => setCatIcon(ic)}
                    style={{ width: 32, height: 32, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: catIcon === ic ? t.accentSoft : t.surfaceSunken }}>
                    <Icon name={ic} size={17} color={catIcon === ic ? t.accentDeep : t.textMuted} />
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={addCat} style={({ pressed }) => ({
                height: 44, borderRadius: radius.md, backgroundColor: pressed ? t.accentDeep : t.accent,
                alignItems: 'center', justifyContent: 'center', transform: [{ scale: pressed ? 0.98 : 1 }],
              })}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: t.onAccent }}>Add category</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Card>

      <View style={{ borderRadius: radius.lg, padding: 18, backgroundColor: t.heroA }}>
        <Text style={{ fontFamily: font.display, fontSize: 16, color: t.onAccent }}>Take your data anywhere</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: t.onAccent, opacity: 0.85, marginTop: 6 }}>
          Download your money flow as Markdown — drop it into Obsidian, Notion, or share it.
        </Text>
        <Pressable onPress={onExport} style={({ pressed }) => ({
          marginTop: 14, height: 44, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.92)',
          flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', transform: [{ scale: pressed ? 0.97 : 1 }],
        })}>
          <Icon name="download" size={16} color="#464034" />
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: '#464034' }}>Download .md</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => Alert.alert('Reset all data back to the sample?', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { resetToSample(); showToast('Sample data restored'); } },
      ])} style={{ alignSelf: 'center', padding: 8 }}>
        <Text style={{ fontFamily: font.body, fontSize: 11, color: t.textFaint }}>Reset sample data</Text>
      </Pressable>
    </ScrollView>
  );
}

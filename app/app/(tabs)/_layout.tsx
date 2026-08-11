import { Tabs, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { font, radius, shadowRaised } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';

const TABS = [
  { name: 'index', label: 'Home', icon: 'home' },
  { name: 'charts', label: 'Charts', icon: 'chart' },
  { name: 'reports', label: 'Reports', icon: 'report' },
  { name: 'accounts', label: 'Accounts', icon: 'wallet' },
];

export default function TabLayout() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.surfacePage } }}
      tabBar={({ state, navigation }) => (
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          paddingBottom: Math.max(insets.bottom, 10), paddingTop: 6, paddingHorizontal: 10,
          backgroundColor: t.surfaceCard, borderTopWidth: 1, borderTopColor: t.borderSoft,
        }}>
          {TABS.map((tab, i) => {
            const active = state.index === i;
            const item = (
              <Pressable key={tab.name} onPress={() => navigation.navigate(tab.name)}
                style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 3, paddingVertical: 8, minHeight: 44, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
                <Icon name={tab.icon} size={22} color={active ? t.accent : t.textFaint} />
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 10.5, color: active ? t.accent : t.textFaint }}>{tab.label}</Text>
              </Pressable>
            );
            // center + button between Charts and Reports
            if (i === 2) return [
              <Pressable key="add" onPress={() => router.push('/sheets/add-transaction')}
                style={({ pressed }) => ({
                  width: 54, height: 54, borderRadius: radius.pill, marginHorizontal: 8,
                  backgroundColor: pressed ? t.accentDeep : t.accent, alignItems: 'center', justifyContent: 'center',
                  transform: [{ scale: pressed ? 0.92 : 1 }], ...shadowRaised,
                })}>
                <Icon name="plus" size={24} color={t.onAccent} stroke={2} />
              </Pressable>,
              item,
            ];
            return item;
          })}
        </View>
      )}
    >
      {TABS.map(tab => <Tabs.Screen key={tab.name} name={tab.name} />)}
    </Tabs>
  );
}

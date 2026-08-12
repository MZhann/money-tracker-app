import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque';
import { InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold } from '@expo-google-fonts/instrument-sans';
import { SplineSansMono_400Regular, SplineSansMono_500Medium } from '@expo-google-fonts/spline-sans-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { Toast } from '@/components/ui';
import { useFlow } from '@/store/useFlow';
import { useTheme } from '@/theme/useTheme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_600SemiBold,
    InstrumentSans_400Regular, InstrumentSans_500Medium, InstrumentSans_600SemiBold,
    SplineSansMono_400Regular, SplineSansMono_500Medium,
  });
  const init = useFlow(s => s.init);
  const ready = useFlow(s => s.ready);
  const isNight = useFlow(s => s.settings.theme === 'night');
  const t = useTheme();

  useEffect(() => { init(); }, []);
  if (!fontsLoaded || !ready) return <View style={{ flex: 1, backgroundColor: '#F6F2E7' }} />;

  return (
    <View style={{ flex: 1, backgroundColor: t.surfacePage }}>
      <StatusBar style={isNight ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.surfacePage } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="account/[id]" options={{ animation: 'slide_from_right' }} />
        {/* Full modal card (not formSheet): its flex layout pins the save button to the bottom. */}
        <Stack.Screen name="sheets/add-transaction" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sheets/edit-account" options={{ presentation: 'formSheet', sheetGrabberVisible: true, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sheets/add-debt" options={{ presentation: 'formSheet', sheetGrabberVisible: true, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sheets/edit-asset" options={{ presentation: 'formSheet', sheetGrabberVisible: true, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="sheets/add-category" options={{ presentation: 'formSheet', sheetGrabberVisible: true, animation: 'slide_from_bottom' }} />
      </Stack>
      <Toast />
    </View>
  );
}

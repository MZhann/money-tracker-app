import React from 'react';
import { Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CatColor } from '../lib/money';
import { Palette, font, radius, shadowCard, space } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { useFlow } from '../store/useFlow';
import { ICONS } from './icons';

export function Icon({ name, size = 20, color, stroke = 1.75 }: { name: string; size?: number; color: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={ICONS[name] ?? ICONS.cart} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export const catTint = (t: Palette, color: CatColor) => ({
  moss: { fg: t.positive, bg: t.positiveSoft },
  clay: { fg: t.negative, bg: t.negativeSoft },
  lake: { fg: t.transfer, bg: t.transferSoft },
  sun: { fg: t.warning, bg: t.warningSoft },
}[color]);

export function CategoryIcon({ icon, color, size = 40 }: { icon: string; color: CatColor; size?: number }) {
  const t = useTheme();
  const tint = catTint(t, color);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={size / 2} color={tint.fg} />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: t.surfaceCard, borderColor: t.borderSoft, borderWidth: 1, borderRadius: radius.lg, ...shadowCard }, style]}>
      {children}
    </View>
  );
}

export function AmountText({ kzt, str, color, size = 15, weight = 'medium' }: { kzt?: never; str: string; color?: string; size?: number; weight?: 'regular' | 'medium' }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: weight === 'medium' ? font.monoMedium : font.mono, fontSize: size, color: color ?? t.textBody, fontVariant: ['tabular-nums'] }}>
      {str}
    </Text>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: 40, paddingHorizontal: 14, borderRadius: radius.md, justifyContent: 'center',
        borderWidth: 1, borderColor: selected ? t.accent : t.borderSoft,
        backgroundColor: selected ? t.accentSoft : t.surfaceRaised,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: selected ? t.accentDeep : t.textMuted }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange, tint }: {
  options: { value: T; label: string; color?: string }[]; value: T; onChange: (v: T) => void; tint?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.surfaceSunken, borderRadius: radius.pill, padding: 4, gap: 4 }}>
      {options.map(o => {
        const sel = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{
            flex: 1, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center',
            backgroundColor: sel ? t.surfaceCard : 'transparent', ...(sel ? shadowCard : {}),
          }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: sel ? (tint && o.color ? o.color : t.textBody) : t.textMuted }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function CapsLabel({ children }: { children: string }) {
  const t = useTheme();
  return (
    <Text style={{ fontFamily: font.bodyMedium, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: t.textFaint }}>
      {children}
    </Text>
  );
}

export function Toast() {
  const t = useTheme();
  const toast = useFlow(s => s.toast);
  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 112, alignItems: 'center' }}>
      <View style={{ backgroundColor: '#464034', borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 10 }}>
        <Text style={{ color: '#FBF8F0', fontFamily: font.body, fontSize: 13 }}>{toast}</Text>
      </View>
    </View>
  );
}

export function ScreenPad({ children }: { children: React.ReactNode }) {
  return <View style={{ paddingHorizontal: space(5), gap: space(4) }}>{children}</View>;
}

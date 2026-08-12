import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleProp, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CURRENCIES, CatColor, Currency, SYM, addMonths, monthLabel, todayISO } from '../lib/money';
import { Palette, font, radius, shadowCard, shadowRaised, space } from '../theme/tokens';
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

// Category tints: each color has a light and a dark pair so chips stay readable in the night theme.
const CAT_TINTS: Record<CatColor, { light: { fg: string; bg: string }; dark: { fg: string; bg: string } }> = {
  moss:   { light: { fg: '#5E8E68', bg: '#DFEDDD' }, dark: { fg: '#8FC79A', bg: '#2F4636' } },
  clay:   { light: { fg: '#C07B57', bg: '#F7E5D7' }, dark: { fg: '#D89572', bg: '#4A382E' } },
  lake:   { light: { fg: '#5581A8', bg: '#DCE8F4' }, dark: { fg: '#8FB2D4', bg: '#2F3D50' } },
  sun:    { light: { fg: '#D9A83C', bg: '#F9EFCF' }, dark: { fg: '#E3C56A', bg: '#4A422A' } },
  rose:   { light: { fg: '#C25E7A', bg: '#F7DEE6' }, dark: { fg: '#E39AB0', bg: '#4A2F38' } },
  violet: { light: { fg: '#8A63B8', bg: '#EBE1F5' }, dark: { fg: '#B99BE0', bg: '#3C3050' } },
  indigo: { light: { fg: '#5C6BC0', bg: '#E2E5F6' }, dark: { fg: '#9FA8DA', bg: '#2F3450' } },
  teal:   { light: { fg: '#3D8E86', bg: '#D9EEEC' }, dark: { fg: '#7CC5BD', bg: '#28423F' } },
  lime:   { light: { fg: '#7C9A3E', bg: '#E9F2D4' }, dark: { fg: '#B4CC72', bg: '#3A452A' } },
  amber:  { light: { fg: '#C98A2E', bg: '#F7EAD2' }, dark: { fg: '#E0B36A', bg: '#4A3C26' } },
  coral:  { light: { fg: '#D96C4F', bg: '#FAE3DC' }, dark: { fg: '#EFA08A', bg: '#4E332B' } },
  slate:  { light: { fg: '#64748B', bg: '#E4E8EE' }, dark: { fg: '#A3B0C2', bg: '#333A46' } },
  pink:   { light: { fg: '#C86CA5', bg: '#F7E0EE' }, dark: { fg: '#E5A3CC', bg: '#472F3E' } },
  cyan:   { light: { fg: '#3E93B8', bg: '#DCEEF6' }, dark: { fg: '#84C3DC', bg: '#2A3F4B' } },
  brown:  { light: { fg: '#8B6A4F', bg: '#EEE4DA' }, dark: { fg: '#C0A184', bg: '#3E332A' } },
  mint:   { light: { fg: '#4FA97C', bg: '#DDF1E5' }, dark: { fg: '#8ED6AF', bg: '#2B4438' } },
};
export const catTint = (t: Palette, color: CatColor) => CAT_TINTS[color]?.[t.mode] ?? CAT_TINTS.moss[t.mode];

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

/** Dropdown select: a field (or bare trigger) that opens a modal option list. */
export function Select<T extends string>({ value, options, onChange, variant = 'field' }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; variant?: 'field' | 'bare';
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const sel = options.find(o => o.value === value);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={({ pressed }) => variant === 'field' ? {
        height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        borderWidth: 1, borderColor: t.borderSoft, borderRadius: radius.md, paddingHorizontal: 12,
        backgroundColor: pressed ? t.surfaceSunken : t.surfaceRaised,
      } : { flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.6 : 1 }}>
        <Text style={{ fontFamily: variant === 'field' ? font.bodyMedium : font.mono, fontSize: variant === 'field' ? 14 : 22, color: variant === 'field' ? t.textBody : t.textFaint }}>
          {sel?.label ?? '—'}
        </Text>
        <Icon name="chevronDown" size={variant === 'field' ? 15 : 16} color={t.textFaint} stroke={2} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: t.scrim, justifyContent: 'center', padding: space(8) }} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: t.surfaceCard, borderRadius: radius.lg, overflow: 'hidden', maxHeight: '65%', ...shadowRaised }}>
            <ScrollView>
              {options.map((o, i) => (
                <Pressable key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    paddingHorizontal: 18, paddingVertical: 14,
                    borderBottomWidth: i < options.length - 1 ? 1 : 0, borderBottomColor: t.borderSoft,
                    backgroundColor: pressed ? t.surfaceSunken : o.value === value ? t.accentSoft : 'transparent',
                  })}>
                  <Text style={{ fontFamily: o.value === value ? font.bodySemiBold : font.body, fontSize: 15, color: o.value === value ? t.accentDeep : t.textBody }}>
                    {o.label}
                  </Text>
                  {o.value === value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} />}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

export const currencyOptions = (list: Currency[] = CURRENCIES) => list.map(c => ({ value: c, label: `${SYM[c]} ${c}` }));

/** Date picker: Today / Yesterday quick chips + a calendar modal for any other day. */
export function DateField({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`;
  const custom = value !== today && value !== yesterday;
  const chip = (label: string, sel: boolean, onPress: () => void, icon?: boolean) => (
    <Pressable key={label} onPress={onPress} style={{
      height: 38, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6,
      borderWidth: 1, borderColor: sel ? t.accent : t.borderSoft, backgroundColor: sel ? t.accentSoft : t.surfaceRaised,
    }}>
      {icon && <Icon name="report" size={14} color={sel ? t.accentDeep : t.textMuted} />}
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: sel ? t.accentDeep : t.textMuted }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      {chip('Today', value === today, () => onChange(today))}
      {chip('Yesterday', value === yesterday, () => onChange(yesterday))}
      {chip(custom ? value : 'Pick a date', custom, () => setOpen(true), true)}
      <CalendarModal open={open} value={value} onClose={() => setOpen(false)} onPick={d => { onChange(d); setOpen(false); }} />
    </View>
  );
}

function CalendarModal({ open, value, onClose, onPick }: { open: boolean; value: string; onClose: () => void; onPick: (iso: string) => void }) {
  const t = useTheme();
  const [ym, setYm] = useState(value.slice(0, 7));
  React.useEffect(() => { if (open) setYm(value.slice(0, 7)); }, [open]);
  const [y, m] = ym.split('-').map(Number);
  const startIdx = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (number | null)[] = [...Array(startIdx).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const iso = (d: number) => `${ym}-${String(d).padStart(2, '0')}`;
  const today = todayISO();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: t.scrim, justifyContent: 'center', padding: space(6) }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: t.surfaceCard, borderRadius: radius.lg, padding: 16, ...shadowRaised }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Pressable hitSlop={8} onPress={() => setYm(addMonths(ym, -1))} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevronLeft" size={17} color={t.textMuted} />
            </Pressable>
            <Text style={{ fontFamily: font.display, fontSize: 16, color: t.textBody }}>{monthLabel(ym)}</Text>
            <Pressable hitSlop={8} onPress={() => setYm(addMonths(ym, 1))} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="chevronRight" size={17} color={t.textMuted} />
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: font.bodyMedium, fontSize: 11, color: t.textFaint, paddingVertical: 4 }}>{d}</Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {cells.map((d, i) => {
              const sel = d !== null && iso(d) === value;
              const isToday = d !== null && iso(d) === today;
              return (
                <Pressable key={i} disabled={d === null} onPress={() => d !== null && onPick(iso(d))}
                  style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
                  {d !== null && (
                    <View style={{
                      width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: sel ? t.accent : 'transparent',
                      borderWidth: isToday && !sel ? 1 : 0, borderColor: t.accent,
                    }}>
                      <Text style={{ fontFamily: sel ? font.bodySemiBold : font.body, fontSize: 14, color: sel ? t.onAccent : t.textBody }}>{d}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Horizontal-scroll currency select. `prefer` currencies (e.g. the account's own) are pinned first. */
export function CurrencyPicker({ value, onChange, prefer }: { value: Currency; onChange: (c: Currency) => void; prefer?: Currency[] }) {
  const list = [...new Set([...(prefer ?? []), ...CURRENCIES])];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {list.map(c => (
        <Chip key={c} label={`${SYM[c]} ${c}`} selected={value === c} onPress={() => onChange(c)} />
      ))}
    </ScrollView>
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

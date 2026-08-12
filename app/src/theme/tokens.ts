// Flow design tokens — ported from flow/tokens/*.css (oklch → sRGB hex approximations).
export type ThemeId = '' | 'mountain' | 'ocean' | 'desert' | 'forest' | 'arctic' | 'night';

export interface Palette {
  mode: 'light' | 'dark';
  surfacePage: string; surfaceCard: string; surfaceRaised: string; surfaceSunken: string;
  textBody: string; textMuted: string; textFaint: string;
  borderSoft: string; borderStrong: string;
  accent: string; accentDeep: string; accentSoft: string; onAccent: string; onHero: string;
  positive: string; positiveSoft: string;
  negative: string; negativeSoft: string;
  transfer: string; transferSoft: string;
  warning: string; warningSoft: string;
  heroA: string; heroB: string; scrim: string;
}

const base: Palette = {
  mode: 'light',
  surfacePage: '#F6F2E7', surfaceCard: '#FBF8F0', surfaceRaised: '#FEFCF7', surfaceSunken: '#EFEADC',
  textBody: '#464034', textMuted: '#746C5D', textFaint: '#9A927F',
  borderSoft: '#E2DCCB', borderStrong: '#D0C9B6',
  accent: '#5E8E68', accentDeep: '#3B6146', accentSoft: '#DFEDDD', onAccent: '#F5FBF2',
  // onHero: text on heroA/heroB surfaces — unlike onAccent it must stay light even
  // when a theme flips its accent bright (night), because hero stays dark everywhere.
  onHero: '#F5FBF2',
  positive: '#5E8E68', positiveSoft: '#DFEDDD',
  negative: '#C07B57', negativeSoft: '#F7E5D7',
  transfer: '#5581A8', transferSoft: '#DCE8F4',
  warning: '#E5B34F', warningSoft: '#F9EFCF',
  heroA: '#3B6146', heroB: '#5E8E68', scrim: 'rgba(60,52,40,0.35)',
};

export const THEMES: Record<ThemeId, Palette> = {
  '': base,
  mountain: { ...base, accent: '#5B7290', accentDeep: '#3D5270', accentSoft: '#E0E6EE', onAccent: '#F4F7FB', heroA: '#3D5270', heroB: '#6B7F97' },
  ocean: { ...base, accent: '#4B8FA3', accentDeep: '#31687D', accentSoft: '#DCEBEE', onAccent: '#F2FAFA', heroA: '#356E85', heroB: '#5FA3AC' },
  desert: { ...base, accent: '#C97E42', accentDeep: '#96562A', accentSoft: '#F6E7D2', onAccent: '#FEF8EE', heroA: '#AE6A33', heroB: '#E0A96B', surfacePage: '#F5EFDD' },
  forest: { ...base, accent: '#4A7D4E', accentDeep: '#2F5936', accentSoft: '#DDEBD9', onAccent: '#F2FAF1', heroA: '#2F5936', heroB: '#578A4E' },
  arctic: {
    ...base, accent: '#6E94AE', accentDeep: '#4A7089', accentSoft: '#E0E9EE', onAccent: '#F3F8FB',
    heroA: '#5983A0', heroB: '#B2CBD8',
    surfacePage: '#F0F3F5', surfaceCard: '#FAFCFD', surfaceSunken: '#E6EBEF', borderSoft: '#DCE2E7', borderStrong: '#C7D0D7',
  },
  night: {
    mode: 'dark',
    surfacePage: '#23253A', surfaceCard: '#2B2D45', surfaceRaised: '#333550', surfaceSunken: '#1D1F31',
    textBody: '#E8E8EF', textMuted: '#B4B5C4', textFaint: '#8B8CA0',
    borderSoft: '#3C3E58', borderStrong: '#4E5070',
    accent: '#A4CC72', accentDeep: '#84AC58', accentSoft: '#3A4A34', onAccent: '#20301C', onHero: '#EDEEF6',
    positive: '#8FC79A', positiveSoft: '#2F4636',
    negative: '#D89572', negativeSoft: '#4A382E',
    transfer: '#8FB2D4', transferSoft: '#2F3D50',
    warning: '#E3C56A', warningSoft: '#4A422A',
    heroA: '#181A2E', heroB: '#33355C', scrim: 'rgba(6,8,18,0.55)',
  },
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 };
export const space = (n: number) => n * 4;
export const font = {
  display: 'BricolageGrotesque_600SemiBold',
  body: 'InstrumentSans_400Regular',
  bodyMedium: 'InstrumentSans_500Medium',
  bodySemiBold: 'InstrumentSans_600SemiBold',
  mono: 'SplineSansMono_400Regular',
  monoMedium: 'SplineSansMono_500Medium',
};
export const duration = { fast: 150, base: 250, slow: 450 };
export const shadowCard = {
  shadowColor: '#5C5240', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
};
export const shadowRaised = {
  shadowColor: '#3C3428', shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
};

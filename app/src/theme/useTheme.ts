import { useFlow } from '../store/useFlow';
import { THEMES, Palette } from './tokens';

export function useTheme(): Palette {
  const theme = useFlow(s => s.settings.theme);
  return THEMES[theme] ?? THEMES[''];
}

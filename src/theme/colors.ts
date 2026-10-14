export interface ColorScheme {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  primary: string;
  primaryText: string;
  text: string;
  textMuted: string;
  low: string;
  medium: string;
  high: string;
  danger: string;
}

export const darkColors: ColorScheme = {
  background: '#0F1115',
  surface: '#1A1D23',
  surfaceAlt: '#22262E',
  border: '#2E323C',
  primary: '#3D8BFF',
  primaryText: '#FFFFFF',
  text: '#F2F3F5',
  textMuted: '#9AA1AC',
  low: '#3CCB7F',
  medium: '#F5B94D',
  high: '#F16063',
  danger: '#F16063',
};

export const lightColors: ColorScheme = {
  background: '#F4F5F7',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  border: '#DDE1E6',
  primary: '#2A6FE0',
  primaryText: '#FFFFFF',
  text: '#161A20',
  textMuted: '#666E7A',
  low: '#1F9D5C',
  medium: '#B3790A',
  high: '#D93B3E',
  danger: '#D93B3E',
};

export function getColors(darkMode: boolean): ColorScheme {
  return darkMode ? darkColors : lightColors;
}

export function getSeverityColor(scheme: ColorScheme) {
  return {
    Low: scheme.low,
    Medium: scheme.medium,
    High: scheme.high,
  } as const;
}

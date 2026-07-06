import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type StatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusChipProps {
  label: string;
  tone: StatusTone;
}

export function StatusChip({ label, tone }: StatusChipProps) {
  const { colors } = useTheme();

  const toneColor = {
    success: colors.secondary,
    warning: colors.tertiary,
    error: colors.error,
    info: colors.primary,
    neutral: colors.onSurfaceVariant,
  }[tone];

  return (
    <View style={[styles.chip, { backgroundColor: toneColor + '1A', borderColor: toneColor + '33' }]}>
      <Text style={[styles.label, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors, spacing, radius, isDark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.outlineVariant,
          borderWidth: isDark ? 1 : 1,
          borderRadius: radius.lg,
          padding: spacing.md,
          shadowColor: '#000',
          shadowOpacity: isDark ? 0 : 0.04,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: isDark ? 0 : 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

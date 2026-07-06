import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof MaterialIcons.glyphMap;
  onRightPress?: () => void;
  rightBadge?: boolean;
}

export function Header({ title, showBack = true, onBack, rightIcon, onRightPress, rightBadge }: HeaderProps) {
  const navigation = useNavigation();
  const { colors, spacing } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.outlineVariant, paddingHorizontal: spacing.containerMargin },
      ]}
    >
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={onBack || (() => navigation.goBack())} style={styles.iconButton} hitSlop={8}>
            <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, { color: colors.onSurface }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {rightIcon && (
        <TouchableOpacity onPress={onRightPress} style={styles.iconButton} hitSlop={8}>
          <MaterialIcons name={rightIcon} size={24} color={colors.onSurfaceVariant} />
          {rightBadge && <View style={[styles.badge, { backgroundColor: colors.error, borderColor: colors.surface }]} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  title: { fontSize: 20, fontWeight: '700' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
});

import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors, radius, spacing, shadows, typography } from '../theme/theme';

export default function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  style,
  autoFocus = false,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View
      style={[
        styles.wrap,
        shadows.sm,
        focused && styles.wrapFocused,
        style,
      ]}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        selectionColor={colors.primary}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value ? (
        <TouchableOpacity
          onPress={() => onChangeText('')}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.clearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search text">
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 4,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    height: 48,
  },
  wrapFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  icon: {
    marginRight: spacing.xs + 2,
    fontSize: 14,
    opacity: 0.8,
  },
  input: {
    flex: 1,
    height: '100%',
    color: colors.text,
    ...typography.body,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
  clearText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
});

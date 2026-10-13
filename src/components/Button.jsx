import React, { useRef } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing, shadows, typography } from '../theme/theme';

export default function Button({
  title,
  onPress,
  variant = 'primary', // primary | secondary | danger | ghost | outline
  icon,
  loading = false,
  disabled = false,
  size = 'md', // sm | md | lg
  style,
  textStyle,
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  const animate = toValue => {
    Animated.spring(scale, {
      toValue,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  const getSpinnerColor = () => {
    switch (variant) {
      case 'ghost':
        return colors.text;
      case 'outline':
        return colors.primary;
      default:
        return colors.textInverted;
    }
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => animate(0.97)}
        onPressOut={() => animate(1)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={({ pressed }) => [
          styles.base,
          styles[variant],
          styles[`size_${size}`],
          variant === 'primary' && !isDisabled && shadows.sm,
          pressed && !isDisabled && styles[`${variant}_pressed`],
          isDisabled && styles.disabled,
        ]}>
        {loading ? (
          <ActivityIndicator color={getSpinnerColor()} size="small" />
        ) : (
          <View style={styles.contentRow}>
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            <Text style={[styles.text, styles[`text_${variant}`], textStyle]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  size_sm: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  size_md: {
    height: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
  },

  // Variants
  primary: { backgroundColor: colors.primary },
  primary_pressed: { backgroundColor: colors.primaryDark },

  secondary: { backgroundColor: colors.secondary },
  secondary_pressed: { opacity: 0.9 },

  danger: { backgroundColor: colors.danger },
  danger_pressed: { opacity: 0.85 },

  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost_pressed: { backgroundColor: colors.surfaceSubtle },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  outline_pressed: { backgroundColor: colors.primaryLight },

  disabled: { opacity: 0.5 },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: { marginRight: spacing.xs },

  text: {
    ...typography.bodyBold,
    letterSpacing: 0.2,
  },
  text_primary: { color: colors.textInverted },
  text_secondary: { color: colors.textInverted },
  text_danger: { color: colors.textInverted },
  text_ghost: { color: colors.text },
  text_outline: { color: colors.primary },
});

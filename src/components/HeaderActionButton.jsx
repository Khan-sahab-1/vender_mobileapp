import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function HeaderActionButton({ title, onPress, icon, accessibilityLabel }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.75}
      style={styles.btn}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  icon: {
    color: colors.onInk,
    marginRight: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  text: {
    color: colors.onInk,
    ...typography.captionBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function ChipsField({ items, onRemove }) {
  if (!items?.length) return null;
  return (
    <View style={styles.wrap}>
      {items.map(item => (
        <View key={item.id} style={styles.chip}>
          <Text style={styles.chipText}>{item.label}</Text>
          <TouchableOpacity
            onPress={() => onRemove(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.removeTouch}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.label}`}>
            <Text style={styles.chipRemove}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: '#D4DAFB',
    borderRadius: radius.pill,
    paddingLeft: spacing.sm + 2,
    paddingRight: spacing.xs + 2,
    paddingVertical: 5,
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  chipText: {
    ...typography.captionBold,
    color: colors.primary,
    marginRight: 6,
  },
  removeTouch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRemove: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
  },
});

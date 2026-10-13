import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, radius, spacing, shadows, typography } from '../theme/theme';

export default function ModuleCard({ icon, title, subtitle, comingSoon, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, shadows.sm, comingSoon && styles.cardSoon]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button">
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
      {comingSoon ? (
        <View style={styles.soonBadge}>
          <Text style={styles.soonBadgeText}>Coming Soon</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 150,
  },
  cardSoon: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    opacity: 0.9,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 22,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 16,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  soonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amberSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  soonBadgeText: {
    color: colors.amberText,
    ...typography.captionBold,
    fontSize: 10,
  },
});

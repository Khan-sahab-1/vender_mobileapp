import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows, typography } from '../theme/theme';

export default function ListRow({
  title,
  subtitle,
  badge,
  onPress,
  onLongPress,
  icon,
  rightText,
  style,
}) {
  return (
    <TouchableOpacity
      style={[styles.row, shadows.sm, style]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      accessibilityRole="button">
      {icon ? (
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}

      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title || '—'}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      {rightText ? (
        <Text style={styles.rightText} numberOfLines={1}>
          {rightText}
        </Text>
      ) : null}

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  icon: {
    fontSize: 18,
  },
  textWrap: {
    flex: 1,
    marginRight: spacing.xs,
  },
  title: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 15,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    backgroundColor: colors.amberSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.xs,
  },
  badgeText: {
    ...typography.captionBold,
    color: colors.amberText,
    fontSize: 11,
  },
  rightText: {
    ...typography.captionBold,
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
    fontWeight: '300',
    marginLeft: 2,
  },
});

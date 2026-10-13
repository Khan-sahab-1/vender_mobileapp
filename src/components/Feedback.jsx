import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';
import Button from './Button';

export function LoadingOverlay({ label = 'Loading...', full = false }) {
  return (
    <View style={[styles.center, full && styles.fullCenter]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({
  icon = '🗂️',
  title = 'Nothing here yet',
  subtitle,
  actionLabel,
  onAction,
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.iconCircle}>
        <Text style={styles.emptyIcon}>{icon}</Text>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="sm"
          style={styles.emptyAction}
        />
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner} accessibilityRole="alert">
      <Text style={styles.errorIcon}>⚠️</Text>
      <View style={styles.errorTextWrap}>
        <Text style={styles.errorText}>{message}</Text>
      </View>
      {onDismiss ? (
        <TouchableOpacity onPress={onDismiss} hitSlop={10} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullCenter: {
    flex: 1,
  },
  loadingLabel: {
    marginTop: spacing.md,
    color: colors.textMuted,
    ...typography.body,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#F5B5B5',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  errorTextWrap: {
    flex: 1,
  },
  errorText: {
    color: '#B42323',
    ...typography.captionBold,
    lineHeight: 18,
  },
  dismissBtn: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  dismissText: {
    color: '#B42323',
    fontSize: 12,
    fontWeight: '700',
  },
});

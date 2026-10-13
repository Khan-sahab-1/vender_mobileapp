import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

const STATE_STYLES = {
  draft: {
    bg: '#EDEFF7',
    dot: '#858CAE',
    fg: '#4A527A',
    label: 'Draft',
  },
  sent: {
    bg: colors.amberSoft,
    dot: colors.amber,
    fg: colors.amberText,
    label: 'Sent',
  },
  purchase: {
    bg: colors.primaryLight,
    dot: colors.primary,
    fg: colors.primary,
    label: 'Purchase Order',
  },
  confirmed: {
    bg: colors.amberSoft,
    dot: colors.amber,
    fg: colors.amberText,
    label: 'Confirmed',
  },
  to_approve: {
    bg: '#FFF8E6',
    dot: '#F59E0B',
    fg: '#B45309',
    label: 'To Approve',
  },
  approved: {
    bg: '#E8F5E9',
    dot: '#2E7D32',
    fg: '#1B5E20',
    label: 'Approved',
  },
  billed: {
    bg: '#E8F5E9',
    dot: '#2E7D32',
    fg: '#1B5E20',
    label: 'Approved',
  },
  open: {
    bg: '#E0F2FE',
    dot: '#0284C7',
    fg: '#0369A1',
    label: 'Open',
  },
  posted: {
    bg: '#EDE9FE',
    dot: '#8B5CF6',
    fg: '#6D28D9',
    label: 'Posted',
  },
  paid: {
    bg: '#E6F9F0',
    dot: '#10B981',
    fg: '#047857',
    label: 'Paid',
  },
  in_progress: {
    bg: colors.amberSoft,
    dot: colors.amber,
    fg: colors.amberText,
    label: 'In Progress',
  },
  done: {
    bg: '#E7F9F2',
    dot: '#00B894',
    fg: '#057A60',
    label: 'Done',
  },
  cancelled: {
    bg: colors.dangerSoft,
    dot: colors.danger,
    fg: '#B42323',
    label: 'Cancelled',
  },
};

export default function StateBadge({ state, label, style }) {
  const info = STATE_STYLES[state] ?? {
    bg: colors.primaryLight,
    dot: colors.primary,
    fg: colors.primaryDark,
    label: state ? String(state).replace(/_/g, ' ') : 'Unknown',
  };

  const displayLabel = label ?? info.label;

  return (
    <View style={[styles.badge, { backgroundColor: info.bg }, style]}>
      <View style={[styles.dot, { backgroundColor: info.dot }]} />
      <Text style={[styles.text, { color: info.fg }]}>{displayLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    ...typography.captionBold,
    textTransform: 'capitalize',
  },
});

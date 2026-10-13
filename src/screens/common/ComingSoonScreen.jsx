import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import { colors, radius, spacing, typography } from '../../theme/theme';

const MODULE_ICONS = {
  Sales: '🛒',
  Purchase: '🧾',
  Accounting: '📊',
};

const MODULE_BLURBS = {
  Sales: 'Quotations, sales orders, delivery tracking and invoicing are on the way.',
  Purchase: 'RFQs, purchase orders, vendor bills and receiving will live here.',
  Accounting: 'Journals, ledgers, payments and financial reports will live here.',
};

export default function ComingSoonScreen({ route, navigation }) {
  const title = route?.params?.title ?? 'This module';

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{MODULE_ICONS[title] ?? '🚧'}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
        <Text style={styles.blurb}>
          {MODULE_BLURBS[title] ?? 'This module is under construction.'}
        </Text>
        <Text style={styles.hint}>
          In the meantime, your Inventory master data (products, pricing, taxes,
          warehouses & locations) is fully manageable today.
        </Text>
        <Button
          title="Go to Inventory"
          variant="primary"
          onPress={() => navigation.navigate('InventoryMenu')}
          style={styles.actionBtn}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 44,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  badge: {
    backgroundColor: colors.amberSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  badgeText: {
    color: colors.amberText,
    ...typography.captionBold,
  },
  blurb: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 22,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    maxWidth: 320,
    lineHeight: 18,
  },
  actionBtn: {
    marginTop: spacing.xl,
    minWidth: 180,
  },
});

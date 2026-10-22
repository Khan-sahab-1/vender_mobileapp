import React from 'react';
import { SectionList, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import ListRow from '../../components/ListRow';
import { getEntity, ACCOUNTING_MENU } from '../../config/entities';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';

const OPERATIONS_MENU = [
  {
    key: 'customer-invoices',
    icon: '📄',
    title: 'Customer Invoices (Bills)',
    subtitle: 'Manage client invoices, payments & receivable ledger',
    screen: navigationScreen.CUSTOMER_INVOICES,
  },
  {
    key: 'vendor-bills',
    icon: '🧾',
    title: 'Vendor Bills',
    subtitle: 'Manage supplier bills, payments & payable ledger',
    screen: navigationScreen.VENDORS_BILLS,
  },
];

const DEFAULT_ACCOUNTING_MODULES = [
  {
    key: 'bank-accounts',
    title: 'Bank Accounts',
    icon: '🏦',
    subtitle: 'Account number, short code & manual tick',
  },
  {
    key: 'account-accounts',
    title: 'Chart of Accounts',
    icon: '📚',
    subtitle: 'General ledger codes & types',
    screen: navigationScreen.CHART_OF_ACCOUNTS,
  },
  {
    key: 'account-groups',
    title: 'Account Groups',
    icon: '🗂️',
    subtitle: 'Prefix-based hierarchy (e.g. 10 Current Assets)',
  },
  {
    key: 'account-types',
    title: 'Account Types',
    icon: '🏷️',
    subtitle: 'Regular, Receivable, Payable, Liquidity',
  },
  {
    key: 'taxes',
    title: 'Taxes',
    icon: '🧾',
    subtitle: 'Sales & purchase VAT/GST rates',
  },
  {
    key: 'pricelists',
    title: 'Pricelists',
    icon: '🏷️',
    subtitle: 'Sales & purchase pricing structures',
  },
  {
    key: 'payment-terms',
    title: 'Payment Terms',
    icon: '💳',
    subtitle: 'Installments & due dates',
  },
];

export default function AccountingMenuScreen({ navigation }) {
  const keys = Array.isArray(ACCOUNTING_MENU) && ACCOUNTING_MENU.length > 0
    ? ACCOUNTING_MENU
    : ['account-accounts', 'account-groups', 'account-types', 'taxes', 'payment-terms'];

  const masterDataModules = keys.map(key => {
    const fromConfig = getEntity(key);
    const fallback = DEFAULT_ACCOUNTING_MODULES.find(m => m.key === key);
    return {
      ...(fromConfig || fallback || { key, title: key, icon: '📄' }),
      screen: key === 'account-accounts' ? navigationScreen.CHART_OF_ACCOUNTS : (fromConfig?.screen || fallback?.screen),
    };
  });

  const sections = [
    { title: 'Invoicing & Bills', badge: 'Live', data: OPERATIONS_MENU },
    { title: 'Accounting Master Data', badge: 'Odoo Standard', data: masterDataModules },
  ];

  return (
    <ScreenContainer>
      <SectionList
        sections={sections}
        keyExtractor={item => item?.key || Math.random().toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.badge ? (
              <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{section.badge}</Text>
              </View>
            ) : null}
          </View>
        )}
        renderItem={({ item }) => {
          if (!item) return null;
          return (
            <ListRow
              icon={item.icon || '📄'}
              title={item.title || 'Untitled'}
              subtitle={item.subtitle ?? `Manage ${item.title?.toLowerCase() || 'records'}`}
              onPress={() => {
                if (item.screen) {
                  navigation.navigate(item.screen, item.params);
                } else if (item.key === 'account-accounts') {
                  navigation.navigate(navigationScreen.CHART_OF_ACCOUNTS);
                } else {
                  navigation.navigate('EntityList', { entityKey: item.key });
                }
              }}
            />
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  sectionBadgeText: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
  },
});


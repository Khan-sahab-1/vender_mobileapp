import React from 'react';
import { SectionList, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import ListRow from '../../components/ListRow';
import { getEntity, SALES_MENU } from '../../config/entities';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';

const OPERATIONS_MENU = [
  {
    key: 'sales-orders',
    icon: '🛒',
    title: 'Sales Orders',
    subtitle: 'Quotations & customer sales orders',
    screen: navigationScreen.SALES_ORDERS_LIST || 'SalesOrdersList',
  },
  {
    key: 'customer-invoices',
    icon: '🧾',
    title: 'Customer Bills',
    subtitle: 'Client invoices, payments & balances',
    screen: navigationScreen.CUSTOMER_INVOICES,
  },
];

const DEFAULT_SALES_MODULES = [
  {
    key: 'customers',
    title: 'Customers',
    icon: '🧑‍💼',
    subtitle: 'Manage client profiles, addresses & pricing',
  },
  {
    key: 'pricelists',
    title: 'Pricelists',
    icon: '🏷️',
    subtitle: 'Customer pricing rules & discounts',
  },
];

export default function SalesMenuScreen({ navigation }) {
  const keys = Array.isArray(SALES_MENU) && SALES_MENU.length > 0
    ? SALES_MENU
    : ['customers'];

  const masterDataModules = keys.map(key => {
    const fromConfig = getEntity(key);
    const fallback = DEFAULT_SALES_MODULES.find(m => m.key === key);
    return {
      ...(fromConfig || fallback || { key, title: key, icon: '📄' }),
      screen: fromConfig?.screen || fallback?.screen,
    };
  });

  const sections = [
    { title: 'Orders & Quotes', badge: 'Live', data: OPERATIONS_MENU },
    { title: 'Sales Master Data', badge: 'Core', data: masterDataModules },
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


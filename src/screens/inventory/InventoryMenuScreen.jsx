import React from 'react';
import { SectionList, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import ListRow from '../../components/ListRow';
import { INVENTORY_MENU, getEntity } from '../../config/entities';
import { colors, radius, spacing, typography } from '../../theme/theme';

const OPERATIONS_MENU = [
  {
    key: 'stock-quants',
    icon: '📊',
    title: 'Stock On Hand',
    subtitle: 'Current quantity by product & location',
    screen: 'StockQuants',
  },
  {
    key: 'receipts',
    icon: '📥',
    title: 'Stock Receipts',
    subtitle: 'Bring goods in from vendors',
    screen: 'PickingList',
    params: { pickingType: 'receipt' },
  },
  {
    key: 'deliveries',
    icon: '📤',
    title: 'Deliveries',
    subtitle: 'Ship goods out to customers',
    screen: 'PickingList',
    params: { pickingType: 'delivery' },
  },
  {
    key: 'internal-transfers',
    icon: '🔄',
    title: 'Internal Transfers',
    subtitle: 'Move stock between locations',
    screen: 'PickingList',
    params: { pickingType: 'internal' },
  },
  {
    key: 'returns',
    icon: '↩️',
    title: 'Returns',
    subtitle: 'Reversed receipts & deliveries',
    screen: 'PickingList',
    params: { pickingType: 'return' },
  },
  {
    key: 'inventory-adjustments-op',
    icon: '🧮',
    title: 'Inventory Adjustments',
    subtitle: 'Count stock & correct differences',
    screen: 'InventoryAdjustmentList',
  },
  {
    key: 'stock-valuation-op',
    icon: '💰',
    title: 'Inventory Valuation',
    subtitle: 'Current stock value by product',
    screen: 'StockValuation',
  },
];

export default function InventoryMenuScreen({ navigation }) {
  const masterDataModules = INVENTORY_MENU.map(getEntity);

  const sections = [
    { title: 'Operations', badge: 'Live', data: OPERATIONS_MENU },
    { title: 'Master Data', badge: 'Core', data: masterDataModules },
  ];

  return ( 
    <ScreenContainer>
      <SectionList
        sections={sections}
        keyExtractor={item => item.key}
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
        renderItem={({ item }) => (
          <ListRow
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle ?? `Manage ${item.title.toLowerCase()}`}
            onPress={() =>
              navigation.navigate(
                item.screen ?? 'EntityList',
                item.screen ? item.params : { entityKey: item.key },
              )
            }
          />
        )}
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
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  sectionBadgeText: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
  },
});

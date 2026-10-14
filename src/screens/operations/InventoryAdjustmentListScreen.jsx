import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  FlatList,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  TextInput,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import StateBadge from '../../components/StateBadge';
import HeaderActionButton from '../../components/HeaderActionButton';
import { LoadingOverlay, EmptyState, ErrorBanner } from '../../components/Feedback';
import { inventoryAdjustmentsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'draft', label: 'Draft' },
  { key: 'done', label: 'Done' },
];

export default function InventoryAdjustmentListScreen({ navigation }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedTab, setSelectedTab] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const handleAddNew = useCallback(() => {
    navigation.navigate('InventoryAdjustmentForm');
  }, [navigation]);

  const renderHeaderRight = useCallback(
    () => <HeaderActionButton title="+ New" onPress={handleAddNew} />,
    [handleAddNew],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Inventory Adjustments',
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const load = useCallback(
    async (mode, activeTab = selectedTab, queryText = search) => {
      try {
        if (mode === 'refresh') setRefreshing(true);
        else setLoading(true);
        setError(null);

        const params = {
          page: 1,
          limit: 50,
        };
        if (user?.companyId) {
          params.companyId = user.companyId;
        }
        if (activeTab !== 'all') {
          params.state = activeTab;
        }
        if (queryText.trim()) {
          params.search = queryText.trim();
        }

        const res = await inventoryAdjustmentsApi.list(params);
        setItems(res.data || []);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedTab, search, user?.companyId],
  );

  useEffect(() => {
    load('initial', selectedTab, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () =>
      load('refresh', selectedTab, search),
    );
    return unsubscribe;
  }, [navigation, selectedTab, search, load]);

  const handleSearchSubmit = () => {
    load('initial', selectedTab, search);
  };

  return (
    <ScreenContainer>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholder="Search reference, notes..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                load('initial', selectedTab, '');
              }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => {
          const isActive = selectedTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setSelectedTab(tab.key)}
              style={[styles.tabBtn, isActive && styles.tabBtnActive]}>
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ErrorBanner message={error} />

      {loading && !refreshing ? (
        <LoadingOverlay full label="Loading inventory adjustments..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={() => load('refresh', selectedTab, search)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🧮"
              title="No inventory adjustments found"
              subtitle={
                selectedTab !== 'all'
                  ? `No adjustments with status "${selectedTab}".`
                  : 'Start a physical count to verify and balance stock levels.'
              }
              actionLabel="+ New Inventory Adjustment"
              onAction={handleAddNew}
            />
          }
          renderItem={({ item }) => {
            const scopeLabel =
              item.inventoryOf === 'category'
                ? `Category: ${item.category?.name || 'Category'}`
                : item.inventoryOf === 'product'
                ? `Product: ${item.product?.name || 'Product'}`
                : item.inventoryOf === 'lot'
                ? `Lot: ${item.lotNumber || 'Lot'}`
                : 'All Products';

            const lineCount = item.lines?.length ?? 0;

            return (
              <TouchableOpacity
                style={[styles.card, shadows.sm]}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('InventoryAdjustmentDetail', { id: item.id })
                }
                accessibilityRole="button">
                {/* Header Row */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <Text style={styles.cardRef} numberOfLines={1}>
                      {item.reference || item.name || 'INV Adjustment'}
                    </Text>
                    <Text style={styles.cardDate}>
                      {item.inventoryDate || 'Today'}
                    </Text>
                  </View>
                  <StateBadge state={item.state} />
                </View>

                {/* Warehouse & Location */}
                <View style={styles.locationRow}>
                  <Text style={styles.locIcon}>📍</Text>
                  <Text style={styles.locText} numberOfLines={1}>
                    {item.warehouse?.name || 'Warehouse'} •{' '}
                    {item.location?.completeName ||
                      item.location?.name ||
                      'Internal Location'}
                  </Text>
                </View>

                {/* Footer Badges */}
                <View style={styles.cardFooter}>
                  <View style={styles.badgeRow}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{scopeLabel}</Text>
                    </View>
                    <View style={styles.linesBadge}>
                      <Text style={styles.linesText}>
                        {lineCount} {lineCount === 1 ? 'line' : 'lines'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textMuted,
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.surface,
    fontWeight: '700',
  },
  listContent: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  cardRef: {
    ...typography.h3,
    color: colors.text,
  },
  cardDate: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  tag: {
    backgroundColor: colors.primaryLight,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    marginRight: spacing.xs,
  },
  tagText: {
    ...typography.caption,
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '600',
  },
  linesBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  linesText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '300',
    marginLeft: spacing.sm,
  },
});

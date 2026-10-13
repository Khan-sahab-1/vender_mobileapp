import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import StateBadge from '../../components/StateBadge';
import HeaderActionButton from '../../components/HeaderActionButton';
import { LoadingOverlay, EmptyState, ErrorBanner } from '../../components/Feedback';
import { inventoryAdjustmentsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

export default function InventoryAdjustmentListScreen({ navigation }) {
  const [items, setItems] = useState([]);
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

  const load = useCallback(async mode => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await inventoryAdjustmentsApi.list({ page: 1, limit: 50 });
      setItems(res.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => load('refresh'));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  return (
    <ScreenContainer>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingOverlay full label="Loading stock adjustments..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🧮"
              title="No inventory adjustments yet"
              subtitle="Count stock and reconcile discrepancies."
              actionLabel="+ New Stock Count"
              onAction={handleAddNew}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.row, shadows.sm]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('InventoryAdjustmentDetail', { id: item.id })}
              accessibilityRole="button">
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.name || 'Unnamed Adjustment'}
                </Text>
                <StateBadge state={item.state} />
              </View>

              <View style={styles.rowBottom}>
                <View style={styles.linesBadge}>
                  <Text style={styles.linesText}>
                    {item.lines?.length ?? 0} count line{item.lines?.length === 1 ? '' : 's'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rowTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linesBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  linesText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '300',
  },
});

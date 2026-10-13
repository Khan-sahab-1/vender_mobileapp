import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { LoadingOverlay, EmptyState, ErrorBanner } from '../../components/Feedback';
import { stockValuationApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

export default function StockValuationScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async mode => {
    try {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await stockValuationApi.summary();
      setItems(data);
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

  const totalValue = items.reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
  const totalUnits = items.reduce((sum, item) => sum + Number(item.quantityOnHand || 0), 0);

  return (
    <ScreenContainer>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingOverlay full label="Calculating inventory valuation..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.productId)}
          refreshing={refreshing}
          onRefresh={() => load('refresh')}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            items.length ? (
              <View style={[styles.heroCard, shadows.md]}>
                <View style={styles.heroTop}>
                  <Text style={styles.heroLabel}>Total Inventory Value</Text>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{totalUnits} units total</Text>
                  </View>
                </View>
                <Text style={styles.heroValue}>
                  ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={styles.heroFooter}>Across {items.length} valued products</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="💰"
              title="No valuation data yet"
              subtitle="Validate a Stock Receipt to start building inventory value."
            />
          }
          renderItem={({ item }) => (
            <View style={[styles.rowCard, shadows.sm]}>
              <View style={styles.rowLeft}>
                <Text style={styles.productName} numberOfLines={1}>
                  {item.productName || 'Product'}
                </Text>
                <Text style={styles.meta}>
                  {item.quantityOnHand} on hand · avg ${Number(item.averageCost || 0).toFixed(2)} / unit
                </Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.itemTotal}>
                  ${Number(item.totalValue || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },
  heroCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  heroLabel: {
    ...typography.captionBold,
    color: colors.onInkMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  heroBadgeText: {
    ...typography.captionBold,
    color: colors.onInk,
    fontSize: 11,
  },
  heroValue: {
    color: colors.onInk,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  heroFooter: {
    ...typography.caption,
    color: colors.onInkMuted,
  },
  rowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  rowLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  productName: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 15,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '700',
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import ListRow from '../../components/ListRow';
import PickerModal from '../../components/PickerModal';
import { LoadingOverlay, EmptyState, ErrorBanner } from '../../components/Feedback';
import { stockQuantsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

export default function StockQuantsScreen() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [product, setProduct] = useState(null);
  const [location, setLocation] = useState(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const fetchPage = useCallback(
    async (pageNum, mode) => {
      try {
        if (mode === 'refresh') setRefreshing(true);
        else if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const res = await stockQuantsApi.list({
          page: pageNum,
          limit: 20,
          productId: product?.id,
          locationId: location?.id,
        });
        setTotalPages(res.totalPages ?? 1);
        setPage(res.page ?? pageNum);
        setItems(prev => (pageNum === 1 ? res.data : [...prev, ...res.data]));
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [product, location],
  );

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, location]);

  const hasFilters = !!(product || location);

  return (
    <ScreenContainer>
      {/* Filter Bar */}
      <View style={styles.filterSection}>
        <View style={styles.filtersRow}>
          <TouchableOpacity
            style={[styles.filterChip, shadows.sm, product && styles.filterChipActive]}
            onPress={() => setProductPickerOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.filterLabel}>Product</Text>
            <View style={styles.filterValueRow}>
              <Text
                style={[styles.filterValue, product && styles.filterValueActive]}
                numberOfLines={1}>
                {product?.label ?? 'All Products'}
              </Text>
              <Text style={styles.filterArrow}>▼</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, shadows.sm, location && styles.filterChipActive]}
            onPress={() => setLocationPickerOpen(true)}
            activeOpacity={0.7}
            accessibilityRole="button">
            <Text style={styles.filterLabel}>Location</Text>
            <View style={styles.filterValueRow}>
              <Text
                style={[styles.filterValue, location && styles.filterValueActive]}
                numberOfLines={1}>
                {location?.label ?? 'All Locations'}
              </Text>
              <Text style={styles.filterArrow}>▼</Text>
            </View>
          </TouchableOpacity>
        </View>

        {hasFilters && (
          <TouchableOpacity
            style={styles.clearBar}
            onPress={() => {
              setProduct(null);
              setLocation(null);
            }}
            hitSlop={8}>
            <Text style={styles.clearText}>Clear active filters ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ErrorBanner message={error} />

      {loading ? (
        <LoadingOverlay full label="Fetching inventory stock..." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={() => fetchPage(1, 'refresh')}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loadingMore && page < totalPages) fetchPage(page + 1);
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="📊"
              title="No stock on hand"
              subtitle={
                hasFilters
                  ? 'No items matched your current filter criteria.'
                  : 'Validate a Stock Receipt to bring initial inventory in.'
              }
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <LoadingOverlay label="Loading more..." />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ListRow
              icon="📦"
              title={item.product?.name || 'Item'}
              subtitle={item.location?.completeName ?? item.location?.name ?? 'Main Stock'}
              badge={`${Number(item.quantity)} in stock`}
              onPress={() => {}}
            />
          )}
        />
      )}

      <PickerModal
        visible={productPickerOpen}
        onClose={() => setProductPickerOpen(false)}
        onSelect={item => setProduct(item)}
        selectedValue={product?.id}
        title="Filter by Product"
        relation="products"
      />
      <PickerModal
        visible={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelect={item => setLocation(item)}
        selectedValue={location?.id}
        title="Filter by Location"
        relation="locations"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  filterSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  filterLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  filterValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  filterValue: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 13,
    flex: 1,
  },
  filterValueActive: {
    color: colors.primary,
  },
  filterArrow: {
    fontSize: 9,
    color: colors.textMuted,
    marginLeft: 4,
  },
  clearBar: {
    alignSelf: 'center',
    marginTop: spacing.xs + 2,
  },
  clearText: {
    ...typography.captionBold,
    color: colors.danger,
    fontSize: 12,
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
  },
  footerLoader: {
    padding: spacing.md,
  },
});

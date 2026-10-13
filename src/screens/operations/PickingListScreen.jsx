import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import StateBadge from '../../components/StateBadge';
import HeaderActionButton from '../../components/HeaderActionButton';
import { LoadingOverlay, EmptyState, ErrorBanner } from '../../components/Feedback';
import { stockPickingsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

const TYPE_META = {
  receipt: { title: 'Stock Receipts', icon: '📥', canCreate: true, actionLabel: '+ New Receipt' },
  delivery: { title: 'Deliveries', icon: '📤', canCreate: true, actionLabel: '+ New Delivery' },
  internal: { title: 'Internal Transfers', icon: '🔄', canCreate: true, actionLabel: '+ New Transfer' },
  return: { title: 'Returns', icon: '↩️', canCreate: false, actionLabel: null },
};

export default function PickingListScreen({ route, navigation }) {
  const { pickingType } = route.params;
  const meta = useMemo(
    () => TYPE_META[pickingType] ?? { title: 'Transfers', icon: '📦', canCreate: true },
    [pickingType],
  );

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const handleAddNew = useCallback(() => {
    navigation.navigate('PickingForm', { pickingType });
  }, [navigation, pickingType]);

  const renderHeaderRight = useCallback(() => {
    if (!meta.canCreate) return null;
    return <HeaderActionButton title="+ New" onPress={handleAddNew} />;
  }, [meta.canCreate, handleAddNew]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: meta.title,
      headerRight: meta.canCreate ? renderHeaderRight : undefined,
    });
  }, [navigation, meta, renderHeaderRight]);

  const fetchPage = useCallback(
    async (pageNum, mode) => {
      try {
        if (mode === 'refresh') setRefreshing(true);
        else if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const res = await stockPickingsApi.list({ page: pageNum, limit: 20, pickingType });
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
    [pickingType],
  );

  useEffect(() => {
    fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => fetchPage(1, 'refresh'));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  return (
    <ScreenContainer>
      <ErrorBanner message={error} />
      {loading ? (
        <LoadingOverlay full label={`Loading ${meta.title.toLowerCase()}...`} />
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
              icon={meta.icon}
              title={`No ${meta.title.toLowerCase()} yet`}
              subtitle={
                meta.canCreate
                  ? 'Tap "+ New" to initiate a new movement.'
                  : 'Returns appear here once initiated from completed transfers.'
              }
              actionLabel={meta.canCreate ? meta.actionLabel : null}
              onAction={meta.canCreate ? handleAddNew : null}
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
            <TouchableOpacity
              style={[styles.row, shadows.sm]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PickingDetail', { id: item.id })}
              accessibilityRole="button">
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{item.name}</Text>
                <StateBadge state={item.state} />
              </View>

              <View style={styles.routeWrap}>
                <Text style={styles.routeSource} numberOfLines={1}>
                  {item.sourceLocation?.name || 'Unknown Source'}
                </Text>
                <Text style={styles.routeArrow}>→</Text>
                <Text style={styles.routeDest} numberOfLines={1}>
                  {item.destLocation?.name || 'Unknown Dest'}
                </Text>
              </View>

              <View style={styles.rowMetaBar}>
                {item.partner?.name ? (
                  <View style={styles.partnerBadge}>
                    <Text style={styles.partnerText} numberOfLines={1}>
                      {item.partner.name}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.movesCount}>
                  {item.moves?.length ?? 0} item{item.moves?.length === 1 ? '' : 's'}
                </Text>
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
  footerLoader: {
    padding: spacing.md,
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
    marginBottom: spacing.xs + 2,
  },
  rowTitle: {
    ...typography.h3,
    color: colors.text,
  },
  routeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  routeSource: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
  },
  routeArrow: {
    color: colors.primary,
    fontWeight: '800',
    marginHorizontal: spacing.xs + 2,
  },
  routeDest: {
    ...typography.bodyBold,
    color: colors.text,
    fontSize: 13,
    flexShrink: 1,
  },
  rowMetaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  partnerBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    maxWidth: '60%',
  },
  partnerText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  movesCount: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 11,
  },
});

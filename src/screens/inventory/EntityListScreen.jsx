import React, { useCallback, useEffect, useState, useLayoutEffect } from 'react';
import { FlatList, Alert, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import ListRow from '../../components/ListRow';
import SearchBar from '../../components/SearchBar';
import HeaderActionButton from '../../components/HeaderActionButton';
import { LoadingOverlay, EmptyState, ErrorBanner } from '../../components/Feedback';
import { createCrudApi } from '../../api/crud';
import { getErrorMessage } from '../../api/client';
import { getEntity } from '../../config/entities';
import { colors, spacing, shadows, typography } from '../../theme/theme';

export default function EntityListScreen({ route, navigation }) {
  const { entityKey } = route.params || {};
  const entity = getEntity(entityKey);
  const api = entity ? createCrudApi(entity.endpoint) : null;

  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const handleAddNew = useCallback(() => {
    navigation.navigate('EntityForm', { entityKey, id: null });
  }, [navigation, entityKey]);

  const renderHeaderRight = useCallback(
    () => <HeaderActionButton title="+ Add" onPress={handleAddNew} />,
    [handleAddNew],
  );

  useLayoutEffect(() => {
    if (!entity) return;
    navigation.setOptions({
      title: entity.title,
      headerRight: renderHeaderRight,
    });
  }, [navigation, entity, renderHeaderRight]);

  const fetchPage = useCallback(
    async (pageNum, searchTerm, mode) => {
      if (!api) {
        setLoading(false);
        return;
      }
      try {
        if (mode === 'refresh') setRefreshing(true);
        else if (pageNum === 1) setLoading(true);
        else setLoadingMore(true);
        setError(null);

        const res = await api.list({
          page: pageNum,
          limit: 20,
          search: searchTerm || undefined,
          ...(entity?.defaultParams || {}),
        });
        setTotalPages(res.totalPages ?? 1);
        setPage(res.page ?? pageNum);
        setItems(prev => (pageNum === 1 ? (res?.data || []) : [...prev, ...(res?.data || [])]));
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityKey],
  );

  useEffect(() => {
    if (!api) return;
    fetchPage(1, search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    if (!api) return;
    const unsubscribe = navigation.addListener('focus', () => fetchPage(1, search, 'refresh'));
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  const handleDelete = item => {
    if (!entity || !api) return;
    Alert.alert(
      `Delete ${entity.singular}?`,
      `"${item[entity.primaryField] ?? item.name ?? item.id}" will be removed. This cannot be undone from the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.remove(item.id);
              fetchPage(1, search, 'refresh');
            } catch (e) {
              Alert.alert('Error', getErrorMessage(e));
            }
          },
        },
      ],
    );
  };

  const renderSubtitle = item => {
    if (!entity?.secondaryField) return undefined;
    const val = item[entity.secondaryField];
    if (val === null || val === undefined || val === '') return undefined;
    return String(val);
  };

  if (!entity) {
    return (
      <ScreenContainer>
        <View style={styles.topSection}>
          <ErrorBanner message={`Entity configuration for "${entityKey}" not found.`} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.topSection}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${entity.title.toLowerCase()}...`}
        />
        <ErrorBanner message={error} />

        {!loading && items.length > 0 ? (
          <View style={styles.metaRow}>
            <Text style={styles.countText}>
              {items.length} {items.length === 1 ? entity.singular.toLowerCase() : entity.title.toLowerCase()}
            </Text>
            <Text style={styles.hintText}>Long-press to delete</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <LoadingOverlay full label={`Loading ${entity.title.toLowerCase()}...`} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item?.id ?? Math.random())}
          refreshing={refreshing}
          onRefresh={() => fetchPage(1, search, 'refresh')}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (!loadingMore && page < totalPages) fetchPage(page + 1, search);
          }}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon={entity.icon}
              title={`No ${entity.title.toLowerCase()} yet`}
              subtitle={`Tap "+ Add" to create your first ${entity.singular.toLowerCase()}.`}
              actionLabel={`+ Add ${entity.singular}`}
              onAction={handleAddNew}
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
              icon={entity.icon}
              title={item[entity.primaryField] ?? item.name ?? item.code ?? item.id ?? '—'}
              subtitle={renderSubtitle(item)}
              onPress={() => navigation.navigate('EntityForm', { entityKey, id: item.id })}
              onLongPress={() => handleDelete(item)}
            />
          )}
        />
      )}

      {/* Floating Action Button for quick add */}
      <TouchableOpacity
        style={[styles.fab, shadows.lg]}
        onPress={handleAddNew}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Add new ${entity.singular}`}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topSection: {
    paddingTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    marginBottom: spacing.xs + 2,
  },
  countText: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  hintText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  listContent: {
    paddingBottom: spacing.xxl * 2,
  },
  footerLoader: {
    padding: spacing.md,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    color: colors.onInk,
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 34,
  },
});

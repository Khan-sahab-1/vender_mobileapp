import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { vendorPortalApi } from '../../api/vendorPortal';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

export default function VendorOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'CONFIRMED' | 'DRAFT'

  const fetchOrders = useCallback(async () => {
    try {
      const res = await vendorPortalApi.getOrders();
      setOrders(res || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      !search ||
      String(o.name || '').toLowerCase().includes(search.toLowerCase());

    const isConfirmed = o.state === 'confirmed' || o.state === 'purchase';
    const isPending = o.state === 'draft' || o.state === 'to_approve' || o.state === 'sent';

    if (selectedFilter === 'CONFIRMED') return matchesSearch && isConfirmed;
    if (selectedFilter === 'PENDING') return matchesSearch && isPending;
    return matchesSearch;
  });

  return (
    <ScreenContainer>
      {/* Header Bar */}
      <View style={[styles.headerBar, shadows.xs]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Purchase Orders</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Search & Filter Row */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by PO number..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterPillsRow}>
          {['ALL', 'CONFIRMED', 'PENDING'].map(f => {
            const isSel = selectedFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, isSel && styles.filterPillActive]}
                onPress={() => setSelectedFilter(f)}>
                <Text
                  style={[
                    styles.filterPillText,
                    isSel && styles.filterPillTextActive,
                  ]}>
                  {f === 'ALL'
                    ? `All (${orders.length})`
                    : f === 'CONFIRMED'
                    ? 'Confirmed'
                    : 'Pending / Draft'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Orders List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>No Purchase Orders Found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try a different search term' : 'No orders matched this filter'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isConfirmed =
              item.state === 'confirmed' || item.state === 'purchase';

            return (
              <TouchableOpacity
                style={[styles.card, shadows.xs]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('VendorOrderDetail', { orderId: item.id })
                }>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.poNumber}>{item.name}</Text>
                    <View style={styles.localTag}>
                      <Text style={styles.localTagText}>Purchase Order</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.stateBadge,
                      isConfirmed
                        ? styles.stateBadgeConfirmed
                        : styles.stateBadgePending,
                    ]}>
                    <Text
                      style={[
                        styles.stateBadgeText,
                        isConfirmed
                          ? styles.stateBadgeTextConfirmed
                          : styles.stateBadgeTextPending,
                      ]}>
                      {String(item.state || 'draft').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Order Date:</Text>
                    <Text style={styles.metaVal}>
                      {String(item.dateOrder || '').slice(0, 10)}
                    </Text>
                  </View>

                  {Boolean(item.datePlanned) && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Expected Delivery:</Text>
                      <Text style={styles.metaVal}>
                        {String(item.datePlanned || '').slice(0, 10)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.amountLabel}>Total Value:</Text>
                  <Text style={styles.amountVal}>
                    ₹{Number(item.amountTotal || 0).toLocaleString('en-IN')}
                  </Text>
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
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodyBold,
    color: colors.textMuted,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  filterSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterPill: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  poNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  odooTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: 4,
  },
  odooTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  localTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    marginTop: 4,
  },
  localTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  stateBadgeConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  stateBadgeConfirmedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  stateBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  stateBadgeTextPending: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  cardBody: {
    marginTop: spacing.sm,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  amountVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});


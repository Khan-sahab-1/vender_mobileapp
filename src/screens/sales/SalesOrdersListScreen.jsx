import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { salesApi } from '../../api/sales';
import { colors, radius, spacing, typography, shadows } from '../../theme/theme';

const STATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Quotations' },
  { key: 'sale', label: 'Confirmed' },
  { key: 'done', label: 'Done' },
];

export default function SalesOrdersListScreen() {
  const navigation = useNavigation();

  // Sales Orders state
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalOrders: 0, quotations: 0, confirmedOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedState, setSelectedState] = useState('all');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([
        salesApi.getOrders({
          search: search.trim() || undefined,
          state: selectedState,
          limit: 100,
        }).catch(() => []),
        salesApi.getStats().catch(() => ({ totalOrders: 0, quotations: 0, confirmedOrders: 0 })),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      if (statsData) setStats(statsData);
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  }, [search, selectedState]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      loadData();
    });
    return unsub;
  }, [navigation, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getStateBadge = state => {
    switch (state) {
      case 'sale':
        return { label: 'Sales Order', bg: '#DCFCE7', text: '#15803D' };
      case 'draft':
        return { label: 'Quotation', bg: '#FEF3C7', text: '#B45309' };
      case 'sent_for_approval':
        return { label: 'For Approval', bg: '#E0E7FF', text: '#4338CA' };
      case 'done':
        return { label: 'Locked / Done', bg: '#F1F5F9', text: '#475569' };
      case 'cancel':
        return { label: 'Cancelled', bg: '#FEE2E2', text: '#B91C1C' };
      default:
        return { label: state || 'Draft', bg: '#F1F5F9', text: '#475569' };
    }
  };

  const renderOrderItem = ({ item }) => {
    const badge = getStateBadge(item.state);
    const formattedAmount = Number(item.totalAmount || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });

    return (
      <TouchableOpacity
        style={[styles.orderCard, shadows.sm]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('SalesOrderDetail', { id: item.id, title: item.soNumber })}>
        <View style={styles.cardHeader}>
          <View style={styles.titleCol}>
            <Text style={styles.soNumber}>{item.soNumber}</Text>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.customer}
            </Text>
          </View>
          <View style={[styles.stateBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.stateBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaCol}>
            <Text style={styles.dateText}>📅 {item.date ? item.date.slice(0, 10) : '—'}</Text>
            {item.salesperson ? (
              <Text style={styles.salespersonText}>👤 {item.salesperson}</Text>
            ) : null}
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountText}>{formattedAmount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Live Stats Header */}
      <View style={styles.statsBanner}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total SOs</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#B45309' }]}>{stats.quotations}</Text>
          <Text style={styles.statLabel}>Quotations</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#15803D' }]}>{stats.confirmedOrders}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by SO# or customer..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* State Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATE_FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, selectedState === f.key && styles.filterChipActive]}
              onPress={() => setSelectedState(f.key)}>
              <Text style={[styles.filterChipText, selectedState === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Order List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching Sales Orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No Sales Orders Found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try modifying your search query' : 'No sales orders found.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsBanner: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    ...typography.h2,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  statLabel: {
    ...typography.tiny,
    color: '#94A3B8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    height: 40,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  filterRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: spacing.xs,
  },
  filterScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#2563EB',
  },
  filterChipText: {
    ...typography.captionBold,
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  soNumber: {
    ...typography.bodyBold,
    color: '#0F172A',
    fontSize: 15,
  },
  customerName: {
    ...typography.caption,
    color: '#64748B',
    marginTop: 2,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  stateBadgeText: {
    ...typography.captionBold,
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  metaCol: {
    flex: 1,
  },
  dateText: {
    ...typography.tiny,
    color: '#64748B',
  },
  salespersonText: {
    ...typography.tiny,
    color: '#64748B',
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 11,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  amountText: {
    ...typography.bodyBold,
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '800',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.caption,
    color: '#64748B',
    marginTop: spacing.sm,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: '#0F172A',
    fontWeight: '700',
  },
  emptySub: {
    ...typography.caption,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
});

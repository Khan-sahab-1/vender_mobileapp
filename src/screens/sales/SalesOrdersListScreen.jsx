import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import HeaderActionButton from '../../components/HeaderActionButton';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { salesApi } from '../../api/sales';
import { colors, radius, spacing, typography, shadows } from '../../theme/theme';
import { formatDate } from '../../utils/dateUtils';

const ORDER_TYPE_LABELS = {
  adhoc: { label: 'Adhoc', bg: '#EFF6FF', fg: '#2563EB' },
  normal: { label: 'Normal', bg: '#F3E8FF', fg: '#7C3AED' },
  arc: { label: 'ARC', bg: '#FEF3C7', fg: '#B45309' },
  open_order: { label: 'Open', bg: '#E0F2FE', fg: '#0284C7' },
  scheduled: { label: 'Scheduled', bg: '#ECFDF5', fg: '#059669' },
};

const STATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'sent_for_approval', label: 'To Approve' },
  { key: 'approved', label: 'Approved' },
  { key: 'cancel', label: 'Cancelled' },
];

export default function SalesOrdersListScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Sales Orders (SO)',
      headerRight: () => (
        <HeaderActionButton
          title="+ New SO"
          onPress={() => navigation.navigate(navigationScreen.SALES_ORDER_FORM)}
        />
      ),
    });
  }, [navigation]);

  // Sales Orders state
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    quotations: 0,
    pendingApproval: 0,
    confirmedOrders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedState, setSelectedState] = useState('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid' (default list)
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleSendForApproval = async (orderId, orderName) => {
    Alert.alert(
      'Send for Approval',
      `Send Sales Order ${orderName || ''} for management approval?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send for Approval',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              await salesApi.sendForApproval(orderId);
              Alert.alert('Success', 'Order sent for management approval!');
              loadData();
            } catch (err) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Failed to send for approval',
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const handleApprove = async (orderId, orderName) => {
    Alert.alert(
      'Approve Sale Order',
      `Approve Sales Order ${orderName || ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Order',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              await salesApi.approveOrder(orderId);
              Alert.alert('Success', 'Sales Order approved successfully!');
              loadData();
            } catch (err) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || 'Failed to approve order',
              );
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

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
      case 'draft':
        return { label: 'Draft', bg: '#FEF3C7', text: '#B45309' };
      case 'sent_for_approval':
      case 'to_approve':
        return { label: 'To Approve', bg: '#EDE9FE', text: '#7C3AED' };
      case 'approved':
      case 'sale':
        return { label: 'Approved', bg: '#DCFCE7', text: '#15803D' };
      case 'done':
        return { label: 'Locked / Done', bg: '#F1F5F9', text: '#475569' };
      case 'cancel':
        return { label: 'Cancelled', bg: '#FEE2E2', text: '#B91C1C' };
      default:
        return { label: state || 'Draft', bg: '#F1F5F9', text: '#475569' };
    }
  };

  const renderListItem = ({ item }) => {
    const badge = getStateBadge(item.state);
    const typeMeta = ORDER_TYPE_LABELS[item.type] || ORDER_TYPE_LABELS.adhoc;
    const formattedAmount = Number(item.totalAmount || item.amountTotal || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });
    const orderDate = item.date ? formatDate(item.date) : 'Today';
    const isActionLoading = actionLoadingId === item.id;
    const customerName =
      typeof item.customer === 'string'
        ? item.customer
        : item.customer?.name || 'Customer';

    return (
      <TouchableOpacity
        style={[styles.listCard, shadows.xs]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate('SalesOrderDetail', {
            id: item.id,
            title: item.soNumber || item.name,
          })
        }>
        {/* Top: SO Number + Type Pill + State Badge */}
        <View style={styles.listCardHeader}>
          <View style={styles.listNumberGroup}>
            <Text style={styles.listSoNumber}>{item.soNumber || item.name}</Text>
            {typeMeta ? (
              <View style={[styles.listTypePill, { backgroundColor: typeMeta.bg }]}>
                <Text style={[styles.listTypePillText, { color: typeMeta.fg }]}>
                  {typeMeta.label}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={[styles.stateBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.stateBadgeText, { color: badge.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* Middle: Customer + Location/Date + Amount */}
        <View style={styles.listCardMiddle}>
          <View style={styles.listCustomerCol}>
            <Text style={styles.listCustomerText} numberOfLines={1}>
              🏢 {customerName}
            </Text>
            <Text style={styles.listMetaText} numberOfLines={1}>
              {item.warehouse?.name ? `📍 ${item.warehouse.name} • ` : ''}📅 {orderDate}
            </Text>
          </View>

          <View style={styles.listAmountCol}>
            <Text style={styles.listAmountLabel}>Grand Total</Text>
            <Text style={styles.listAmountValue}>{formattedAmount}</Text>
          </View>
        </View>

        {/* Dynamic Workflow Actions on List Item */}
        {(item.state === 'draft' ||
          item.state === 'sent_for_approval' ||
          item.state === 'to_approve') && (
          <View style={styles.listActionsRow}>
            <TouchableOpacity
              style={styles.listBtnEdit}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate(navigationScreen.SALES_ORDER_FORM, {
                  orderId: item.id,
                  order: item,
                })
              }>
              <Text style={styles.listBtnEditText}>✏️ Edit</Text>
            </TouchableOpacity>

            {item.state === 'draft' && (
              <TouchableOpacity
                style={styles.listBtnSendApproval}
                disabled={isActionLoading}
                onPress={() =>
                  handleSendForApproval(item.id, item.soNumber || item.name)
                }>
                <Text style={styles.listBtnSendApprovalText}>
                  {isActionLoading ? 'Sending...' : '📤 Send for Approval'}
                </Text>
              </TouchableOpacity>
            )}

            {(item.state === 'sent_for_approval' ||
              item.state === 'to_approve') && (
              <TouchableOpacity
                style={styles.listBtnApprove}
                disabled={isActionLoading}
                onPress={() =>
                  handleApprove(item.id, item.soNumber || item.name)
                }>
                <Text style={styles.listBtnApproveText}>
                  {isActionLoading ? 'Approving...' : '✓ Approve'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }) => {
    const badge = getStateBadge(item.state);
    const typeMeta = ORDER_TYPE_LABELS[item.type] || ORDER_TYPE_LABELS.adhoc;
    const formattedAmount = Number(item.totalAmount || item.amountTotal || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });
    const isActionLoading = actionLoadingId === item.id;
    const customerName =
      typeof item.customer === 'string'
        ? item.customer
        : item.customer?.name || 'Customer';

    return (
      <TouchableOpacity
        style={[styles.orderCard, shadows.sm]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('SalesOrderDetail', { id: item.id, title: item.soNumber || item.name })}>
        <View style={styles.cardHeader}>
          <View style={styles.titleCol}>
            <View style={styles.soNumberRow}>
              <Text style={styles.soNumber}>{item.soNumber || item.name}</Text>
              {typeMeta ? (
                <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
                  <Text style={[styles.typePillText, { color: typeMeta.fg }]}>{typeMeta.label}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.customerName} numberOfLines={1}>
              {customerName}
            </Text>
          </View>
          <View style={[styles.stateBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.stateBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaCol}>
            <Text style={styles.dateText}>📅 {item.date ? formatDate(item.date) : '—'}</Text>
            {item.salesperson ? (
              <Text style={styles.salespersonText}>👤 {item.salesperson}</Text>
            ) : null}
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountText}>{formattedAmount}</Text>
          </View>
        </View>

        {/* Dynamic Workflow Actions on Card */}
        {item.state === 'draft' && (
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.cardBtnEdit}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate(navigationScreen.SALES_ORDER_FORM, {
                  orderId: item.id,
                  order: item,
                })
              }>
              <Text style={styles.cardBtnEditText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardBtnSendApproval}
              disabled={isActionLoading}
              onPress={() => handleSendForApproval(item.id, item.soNumber || item.name)}>
              <Text style={styles.cardBtnSendApprovalText}>
                {isActionLoading ? 'Sending...' : '📤 Send for Approval →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {(item.state === 'sent_for_approval' || item.state === 'to_approve') && (
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              style={styles.cardBtnEdit}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate(navigationScreen.SALES_ORDER_FORM, {
                  orderId: item.id,
                  order: item,
                })
              }>
              <Text style={styles.cardBtnEditText}>✏️ Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cardBtnApprove}
              disabled={isActionLoading}
              onPress={() => handleApprove(item.id, item.soNumber || item.name)}>
              <Text style={styles.cardBtnApproveText}>
                {isActionLoading ? 'Approving...' : '✓ Approve'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Live Stats Header */}
      <View style={styles.statsBanner}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#B45309' }]}>{stats.quotations}</Text>
          <Text style={styles.statLabel}>Draft</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#7C3AED' }]}>{stats.pendingApproval || 0}</Text>
          <Text style={styles.statLabel}>To Approve</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: '#15803D' }]}>{stats.confirmedOrders}</Text>
          <Text style={styles.statLabel}>Approved</Text>
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

      {/* View Toggle Bar (List vs Grid) */}
      <View style={styles.viewToggleBar}>
        <Text style={styles.viewOrderCount}>
          {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
        </Text>
        <View style={styles.toggleButtonGroup}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'list' && styles.viewToggleBtnActive]}
            activeOpacity={0.7}
            onPress={() => setViewMode('list')}>
            <Text
              style={[
                styles.viewToggleBtnText,
                viewMode === 'list' && styles.viewToggleBtnTextActive,
              ]}>
              ☰ List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'grid' && styles.viewToggleBtnActive]}
            activeOpacity={0.7}
            onPress={() => setViewMode('grid')}>
            <Text
              style={[
                styles.viewToggleBtnText,
                viewMode === 'grid' && styles.viewToggleBtnTextActive,
              ]}>
              ⊞ Grid
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Order List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching Sales Orders...</Text>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={orders}
          keyExtractor={item => String(item.id)}
          renderItem={viewMode === 'list' ? renderListItem : renderOrderItem}
          contentContainerStyle={viewMode === 'list' ? styles.listModeContent : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No Sales Orders Found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try modifying your search query' : 'Tap "+ New SO" to create your first Quotation / Sale Order.'}
              </Text>
              <TouchableOpacity
                style={{
                  marginTop: 14,
                  backgroundColor: colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radius.sm,
                }}
                onPress={() => navigation.navigate(navigationScreen.SALES_ORDER_FORM)}>
                <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  + Create Sales Order
                </Text>
              </TouchableOpacity>
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
  viewToggleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  viewOrderCount: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '600',
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  viewToggleBtnActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  viewToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewToggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listModeContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.sm,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.xs,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  listNumberGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listSoNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  listTypePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  listTypePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  listCardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCustomerCol: {
    flex: 1,
    marginRight: 10,
  },
  listCustomerText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: '#0F172A',
    marginBottom: 2,
  },
  listMetaText: {
    ...typography.caption,
    fontSize: 11,
    color: '#64748B',
  },
  listAmountCol: {
    alignItems: 'flex-end',
  },
  listAmountLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#64748B',
    fontWeight: '600',
  },
  listAmountValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
  },
  listActionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  listBtnEdit: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: radius.xs,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBtnEditText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 11,
  },
  listBtnSendApproval: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.xs,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBtnSendApprovalText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 11,
  },
  listBtnApprove: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radius.xs,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listBtnApproveText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 11,
  },
  soNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
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
  cardActionsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  cardBtnEdit: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: radius.xs,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnEditText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
  },
  cardBtnSendApproval: {
    flex: 1,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.xs,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnSendApprovalText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 12,
  },
  cardBtnApprove: {
    flex: 1,
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radius.xs,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBtnApproveText: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 12,
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

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
import StateBadge from '../../components/StateBadge';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { salesApi } from '../../api/sales';
import { colors, radius, spacing, typography, shadows } from '../../theme/theme';
import { formatDate } from '../../utils/dateUtils';

const ORDER_TYPE_LABELS = {
  adhoc: { label: 'Adhoc', bg: '#EFF6FF', fg: '#2563EB' },
  normal: { label: 'Direct', bg: '#F3E8FF', fg: '#7C3AED' },
  arc: { label: 'ARC', bg: '#FEF3C7', fg: '#B45309' },
  open_order: { label: 'Open', bg: '#E0F2FE', fg: '#0284C7' },
  scheduled: { label: 'Scheduled', bg: '#ECFDF5', fg: '#059669' },
};

const STATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'to_approve', label: 'To Approve' },
  { key: 'approved', label: 'Approved' },
  { key: 'cancel', label: 'Cancelled' },
];

export default function SalesOrdersListScreen() {
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Sales Orders',
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

  const loadData = useCallback(async () => {
    try {
      const [ordersData, statsData] = await Promise.all([
        salesApi.getOrders({
          search: search.trim() || undefined,
          state: selectedState === 'to_approve' ? 'sent_for_approval' : selectedState,
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

  // Workflow Action 1: Send for Approval (Transitions to to_approve)
  const handleSendForApproval = async (orderId, orderName) => {
    Alert.alert(
      'Send for Approval',
      `Send Sales Order ${orderName || ''} for manager approval?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send for Approval',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              await salesApi.sendForApproval(orderId);
              Alert.alert('Success', `SO ${orderName || ''} is now pending approval.`);
              loadData();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to send for approval');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  // Workflow Action 2: Admin Approve SO (Direct Customer Bill Created)
  const handleApprove = async (orderId, orderName) => {
    Alert.alert(
      'Approve Sales Order',
      `Approve SO ${orderName}? This will generate both the Outgoing Delivery (WH/OUT/...) and the Customer Bill.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve SO',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              const res = await salesApi.approveOrder(orderId);
              const billNo = res?.customerInvoice?.invoiceNumber || 'Draft Bill';
              const pickingNo = res?.stockPicking?.name || 'Created';
              Alert.alert(
                'SO Approved!',
                `SO ${orderName} approved!\n\n🧾 Customer Bill: ${billNo}\n📦 Delivery Order: ${pickingNo}\n\nInventory dispatch & Accounting entries are ready!`,
                [
                  { text: 'OK' },
                  {
                    text: 'View Bill',
                    onPress: () => {
                      if (res?.customerInvoice) {
                        navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                          invoice: res.customerInvoice,
                          invoiceId: res.customerInvoice.id,
                        });
                      } else {
                        navigation.navigate(navigationScreen.CUSTOMER_INVOICES);
                      }
                    },
                  },
                ],
              );
              loadData();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to approve order');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  // Workflow Action 3: Deliver Goods (Validate Delivery)
  const handleDeliverGoods = async order => {
    const billState = order.customerInvoice?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    if (!isBillValidated) {
      Alert.alert(
        'Invoice Validation Required',
        `Stock delivery cannot be validated yet!\n\nThe Customer Bill (${order.customerInvoice?.invoiceNumber || 'Draft'}) must be validated before physical goods can be delivered out of warehouse stock.\n\nWould you like to open and validate the Customer Bill now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Customer Bill',
            onPress: () => {
              if (order.customerInvoice) {
                navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                  invoice: order.customerInvoice,
                  invoiceId: order.customerInvoice.id,
                });
              } else {
                navigation.navigate(navigationScreen.CUSTOMER_INVOICES);
              }
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Deliver Goods (Validate Dispatch)',
      `Deliver goods for ${order.soNumber || order.name}? This will mark the Delivery Order & Moves as DONE and deduct Warehouse on-hand stock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deliver & Deduct Stock',
          onPress: async () => {
            setActionLoadingId(order.id);
            try {
              await salesApi.deliverGoods(order.id);
              Alert.alert(
                'Stock Updated!',
                `Goods for ${order.soNumber || order.name} delivered!\n\nWarehouse stock quants have been updated and stock valuation recorded.`,
              );
              loadData();
            } catch (err) {
              Alert.alert('Validation Error', err?.response?.data?.message || 'Failed to deliver goods');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const renderListItem = ({ item }) => {
    const typeMeta = ORDER_TYPE_LABELS[item.type] || ORDER_TYPE_LABELS.adhoc;
    const formattedAmount = Number(item.totalAmount || item.amountTotal || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const orderDate = item.date ? formatDate(item.date) : (item.createdAt ? formatDate(item.createdAt) : 'Today');
    const isActionLoading = actionLoadingId === item.id;
    const customerName =
      typeof item.customer === 'string'
        ? item.customer
        : item.customer?.name || 'General Customer';
    const locationName = item.warehouse?.name || item.division?.name || 'Main Warehouse';
    const isToApprove = item.state === 'sent_for_approval' || item.state === 'to_approve';
    const isApproved = item.state === 'approved' || item.state === 'sale';
    const isDraft = item.state === 'draft';

    const billState = item.customerInvoice?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    return (
      <TouchableOpacity
        style={[styles.listCard, shadows.xs]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate(navigationScreen.SALES_ORDER_FORM, { order: item, orderId: item.id })
        }>
        {/* Top: SO Number + Type Pill + State Badge */}
        <View style={styles.listCardHeader}>
          <View style={styles.listNumberGroup}>
            <Text style={styles.listSoNumber}>{item.soNumber || item.name || 'Draft SO'}</Text>
            {typeMeta ? (
              <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
                <Text style={[styles.typePillText, { color: typeMeta.fg }]}>
                  {typeMeta.label}
                </Text>
              </View>
            ) : null}
          </View>
          <StateBadge state={item.state} />
        </View>

        {/* Middle: Customer + Location/Date + Amount */}
        <View style={styles.listCardMiddle}>
          <View style={styles.listCustomerCol}>
            <Text style={styles.listCustomerText} numberOfLines={1}>
              🏢 {customerName}
            </Text>
            <Text style={styles.listMetaText} numberOfLines={1}>
              📍 {locationName} • 📅 {orderDate}
            </Text>
          </View>

          <View style={styles.listAmountCol}>
            <Text style={styles.listAmountLabel}>Grand Total</Text>
            <Text style={styles.listAmountValue}>
              {item.currency || 'INR'} {formattedAmount}
            </Text>
          </View>
        </View>

        {/* Dynamic Workflow Actions on List Item (No Edit Button!) */}
        <View style={styles.actionRow}>
          {isDraft && (
            <TouchableOpacity
              style={styles.btnSendApproval}
              activeOpacity={0.8}
              disabled={isActionLoading}
              onPress={() => handleSendForApproval(item.id, item.soNumber || item.name)}>
              <Text style={styles.btnSendApprovalText}>
                {isActionLoading ? 'Sending...' : 'Send for Approval →'}
              </Text>
            </TouchableOpacity>
          )}

          {isToApprove && (
            <TouchableOpacity
              style={styles.btnApprove}
              activeOpacity={0.8}
              disabled={isActionLoading}
              onPress={() => handleApprove(item.id, item.soNumber || item.name)}>
              <Text style={styles.btnApproveText}>
                {isActionLoading ? 'Approving...' : '✓ Approve SO'}
              </Text>
            </TouchableOpacity>
          )}

          {isApproved && (
            <View style={styles.approvedButtonGroup}>
              {item.customerInvoice && (
                <TouchableOpacity
                  style={styles.btnBill}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                      invoice: item.customerInvoice,
                      invoiceId: item.customerInvoiceId || item.customerInvoice.id,
                    })
                  }>
                  <Text style={styles.btnBillText}>
                    🧾 View Bill: {item.customerInvoice.invoiceNumber || 'Draft Bill'} ›
                  </Text>
                </TouchableOpacity>
              )}

              {item.stockPicking && (
                item.stockPicking.state === 'done' ? (
                  <View style={styles.receiptDoneTag}>
                    <Text style={styles.receiptDoneTagText}>
                      ✓ Stock Delivered ({item.stockPicking.name})
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.btnReceive,
                      !isBillValidated && styles.btnReceiveLocked,
                    ]}
                    activeOpacity={0.8}
                    disabled={isActionLoading}
                    onPress={() => handleDeliverGoods(item)}>
                    <Text
                      style={[
                        styles.btnReceiveText,
                        !isBillValidated && styles.btnReceiveTextLocked,
                      ]}>
                      {isActionLoading
                        ? 'Delivering...'
                        : isBillValidated
                        ? `📦 Deliver Goods (${item.stockPicking.name}) →`
                        : `🔒 Validate Bill First to Deliver Stock`}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }) => {
    const typeMeta = ORDER_TYPE_LABELS[item.type] || ORDER_TYPE_LABELS.adhoc;
    const formattedAmount = Number(item.totalAmount || item.amountTotal || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const isActionLoading = actionLoadingId === item.id;
    const customerName =
      typeof item.customer === 'string'
        ? item.customer
        : item.customer?.name || 'General Customer';
    const divisionName = item.division?.name || 'Main Division';
    const warehouseName = item.warehouse?.name || 'Main Warehouse';
    const isToApprove = item.state === 'sent_for_approval' || item.state === 'to_approve';
    const isApproved = item.state === 'approved' || item.state === 'sale';
    const isDraft = item.state === 'draft';

    const billState = item.customerInvoice?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    return (
      <TouchableOpacity
        style={[styles.card, shadows.sm]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate(navigationScreen.SALES_ORDER_FORM, { order: item, orderId: item.id })
        }>
        {/* Top Row: SO #, Type Pill & State */}
        <View style={styles.cardTopRow}>
          <View style={styles.poNumberBox}>
            <Text style={styles.poNumberText}>{item.soNumber || item.name || 'Draft SO'}</Text>
            {typeMeta ? (
              <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
                <Text style={[styles.typePillText, { color: typeMeta.fg }]}>{typeMeta.label}</Text>
              </View>
            ) : null}
          </View>
          <StateBadge state={item.state} />
        </View>

        {/* Customer & Division Info */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏢</Text>
            <Text style={styles.vendorText} numberOfLines={1}>
              {customerName}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏷️</Text>
            <Text style={styles.divisionText} numberOfLines={1}>
              {divisionName} • {warehouseName}
            </Text>
          </View>
        </View>

        {/* Footer: Date & Total */}
        <View style={styles.cardFooter}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>
              Order: {item.date ? formatDate(item.date) : (item.createdAt ? formatDate(item.createdAt) : 'Today')}
            </Text>
            {item.deliveryDate ? (
              <Text style={styles.dateSubLabel}>
                Delivery: {formatDate(item.deliveryDate)}
              </Text>
            ) : null}
          </View>
          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalAmountText}>
              {item.currency || 'INR'} {formattedAmount}
            </Text>
          </View>
        </View>

        {/* Dynamic Workflow Action Buttons (No Edit Button!) */}
        <View style={styles.actionRow}>
          {isDraft && (
            <TouchableOpacity
              style={styles.btnSendApproval}
              activeOpacity={0.8}
              disabled={isActionLoading}
              onPress={() => handleSendForApproval(item.id, item.soNumber || item.name)}>
              <Text style={styles.btnSendApprovalText}>
                {isActionLoading ? 'Sending...' : 'Send for Approval →'}
              </Text>
            </TouchableOpacity>
          )}

          {isToApprove && (
            <TouchableOpacity
              style={styles.btnApprove}
              activeOpacity={0.8}
              disabled={isActionLoading}
              onPress={() => handleApprove(item.id, item.soNumber || item.name)}>
              <Text style={styles.btnApproveText}>
                {isActionLoading ? 'Approving...' : '✓ Approve SO'}
              </Text>
            </TouchableOpacity>
          )}

          {isApproved && (
            <View style={styles.approvedButtonGroup}>
              {item.customerInvoice && (
                <TouchableOpacity
                  style={styles.btnBill}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                      invoice: item.customerInvoice,
                      invoiceId: item.customerInvoiceId || item.customerInvoice.id,
                    })
                  }>
                  <Text style={styles.btnBillText}>
                    🧾 View Bill: {item.customerInvoice.invoiceNumber || 'Draft Bill'} ›
                  </Text>
                </TouchableOpacity>
              )}

              {item.stockPicking && (
                item.stockPicking.state === 'done' ? (
                  <View style={styles.receiptDoneTag}>
                    <Text style={styles.receiptDoneTagText}>
                      ✓ Stock Delivered ({item.stockPicking.name})
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.btnReceive,
                      !isBillValidated && styles.btnReceiveLocked,
                    ]}
                    activeOpacity={0.8}
                    disabled={isActionLoading}
                    onPress={() => handleDeliverGoods(item)}>
                    <Text
                      style={[
                        styles.btnReceiveText,
                        !isBillValidated && styles.btnReceiveTextLocked,
                      ]}>
                      {isActionLoading
                        ? 'Delivering...'
                        : isBillValidated
                        ? `📦 Deliver Goods (${item.stockPicking.name}) →`
                        : `🔒 Validate Bill First to Deliver Stock`}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredOrders = Array.isArray(orders)
    ? orders.filter(item => {
        const itemState = item.state === 'sale' ? 'approved' : item.state;
        const targetFilter = selectedState === 'to_approve' ? 'sent_for_approval' : selectedState;
        if (targetFilter !== 'all' && itemState !== targetFilter && item.state !== targetFilter) {
          return false;
        }
        if (!search.trim()) return true;
        const query = search.toLowerCase();
        const cName = typeof item.customer === 'string' ? item.customer : item.customer?.name || '';
        return (
          (item.name || '').toLowerCase().includes(query) ||
          (item.soNumber || '').toLowerCase().includes(query) ||
          cName.toLowerCase().includes(query) ||
          (item.division?.name || '').toLowerCase().includes(query) ||
          (item.warehouse?.name || '').toLowerCase().includes(query)
        );
      })
    : [];

  return (
    <View style={styles.container}>
      {/* Top Search Bar */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search SO #, Customer, or Division..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs Chips */}
      <View style={styles.filterRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterListContent}>
          {STATE_FILTERS.map(tab => {
            const isActive = selectedState === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedState(tab.key)}>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* View Toggle Bar (List vs Grid) */}
      <View style={styles.viewToggleBar}>
        <Text style={styles.viewOrderCount}>
          {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
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
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching Sales Orders...</Text>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={filteredOrders}
          keyExtractor={item => String(item.id || item.name)}
          renderItem={viewMode === 'list' ? renderListItem : renderOrderItem}
          contentContainerStyle={viewMode === 'list' ? styles.listModeContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🛒</Text>
              <Text style={styles.emptyTitle}>No Sales Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `No orders matching "${search}"`
                  : selectedState !== 'all'
                  ? `No orders in "${selectedState}" state`
                  : 'Tap "+ New SO" above to create your first Sales Order.'}
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
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textMuted,
    padding: spacing.xs,
  },
  filterRow: {
    paddingVertical: spacing.xs,
  },
  filterListContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  filterChipTextActive: {
    color: colors.textInverted,
  },
  viewToggleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  viewOrderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.xs,
    padding: 2,
    gap: 2,
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.xs - 1,
  },
  viewToggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  viewToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewToggleBtnTextActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listModeContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  listNumberGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  listSoNumber: {
    ...typography.bodyBold,
    color: colors.text,
    fontWeight: '800',
  },
  listCardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listCustomerCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  listCustomerText: {
    ...typography.bodyBold,
    color: colors.text,
  },
  listMetaText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  listAmountCol: {
    alignItems: 'flex-end',
  },
  listAmountLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  listAmountValue: {
    ...typography.bodyBold,
    color: colors.primary,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  poNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  poNumberText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  typePillText: {
    ...typography.tiny,
    fontWeight: '700',
  },
  cardBody: {
    marginVertical: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  vendorText: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
  divisionText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
    paddingTop: spacing.xs,
  },
  dateBox: {
    flex: 1,
  },
  dateLabel: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  dateSubLabel: {
    ...typography.tiny,
    color: colors.primary,
    fontWeight: '600',
  },
  totalBox: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  totalAmountText: {
    ...typography.bodyBold,
    color: colors.text,
    fontWeight: '800',
  },
  actionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
  },
  btnSendApproval: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  btnSendApprovalText: {
    color: colors.textInverted,
    ...typography.captionBold,
  },
  btnApprove: {
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  btnApproveText: {
    color: '#FFFFFF',
    ...typography.captionBold,
  },
  approvedButtonGroup: {
    gap: spacing.xs,
  },
  btnBill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: radius.xs,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  btnBillText: {
    color: '#1D4ED8',
    ...typography.captionBold,
  },
  btnReceive: {
    backgroundColor: '#16A34A',
    borderRadius: radius.xs,
    paddingVertical: 7,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  btnReceiveLocked: {
    backgroundColor: '#E2E8F0',
  },
  btnReceiveText: {
    color: '#FFFFFF',
    ...typography.captionBold,
  },
  btnReceiveTextLocked: {
    color: '#64748B',
  },
  receiptDoneTag: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radius.xs,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  receiptDoneTagText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});

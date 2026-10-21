import React, { useState, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import HeaderActionButton from '../../components/HeaderActionButton';
import SearchBar from '../../components/SearchBar';
import StateBadge from '../../components/StateBadge';
import { LoadingOverlay, EmptyState } from '../../components/Feedback';
import { purchaseOrdersApi } from '../../api/purchase';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';
import { formatDate } from '../../utils/dateUtils';

const ORDER_TYPE_LABELS = {
  adhoc: { label: 'Adhoc', bg: colors.primaryLight, fg: colors.primary },
  direct: { label: 'Direct', bg: '#EDE9FE', fg: '#7C3AED' },
  arc: { label: 'ARC', bg: colors.amberSoft, fg: colors.amberText },
  open_order: { label: 'Open Order', bg: '#E0F2FE', fg: '#0284C7' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'to_approve', label: 'To Approve' },
  { key: 'approved', label: 'Approved' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function PurchaseOrder({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid' (default list)
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const handleAddNew = useCallback(() => {
    navigation.navigate(navigationScreen.PURCHASE_ORDER_FORM);
  }, [navigation]);

  const renderHeaderRight = useCallback(
    () => <HeaderActionButton title="+ New PO" onPress={handleAddNew} />,
    [handleAddNew],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Purchase Orders',
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  const fetchOrders = useCallback(async (isPull = false) => {
    if (isPull) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await purchaseOrdersApi.list({ limit: 100 });
      if (res?.data) {
        setOrders(res.data);
      }
    } catch {
      // retain current
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation, fetchOrders]);

  // Workflow Action 1: Confirm Order (Generate PO Number, stays in draft)
  const handleConfirmOrder = async (orderId, orderName) => {
    Alert.alert(
      'Confirm Order',
      'Confirm this order and generate official PO Number?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Order',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              const res = await purchaseOrdersApi.confirm(orderId);
              Alert.alert(
                'Order Confirmed!',
                `Official Purchase Order ${res?.name || ''} generated successfully.\n\nYou can now send it for approval.`,
              );
              fetchOrders();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to confirm order');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  // Workflow Action 2: Send for Approval (Transitions to to_approve)
  const handleSendForApproval = async (orderId, orderName) => {
    Alert.alert(
      'Send for Approval',
      `Send Purchase Order ${orderName || ''} for manager approval?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send for Approval',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              await purchaseOrdersApi.sendForApproval(orderId);
              Alert.alert('Success', `PO ${orderName || ''} is now pending approval.`);
              fetchOrders();
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

  // Workflow Action 2: Admin Approve PO (Direct Vendor Bill Created)
  const handleApproveOrder = async (orderId, orderName) => {
    Alert.alert(
      'Approve Purchase Order',
      `Approve PO ${orderName}? This will generate both the Incoming Stock Receipt (WH/IN/...) and the Vendor Bill.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve PO',
          onPress: async () => {
            setActionLoadingId(orderId);
            try {
              const res = await purchaseOrdersApi.approve(orderId);
              const billNo = res?.vendorBill?.billNumber || 'Draft Bill';
              const pickingNo = res?.stockPicking?.name;
              Alert.alert(
                'PO Approved!',
                `PO ${orderName} approved!\n\n🧾 Vendor Bill: ${billNo || 'Created'}\n📦 Stock Receipt: ${pickingNo || 'Created'}\n\nInventory moves & Accounting entries are ready!`,
                [
                  { text: 'OK' },
                  {
                    text: 'View Bill',
                    onPress: () => {
                      if (res?.vendorBill) {
                        navigation.navigate(navigationScreen.VENDOR_BILL_DETAIL, {
                          bill: res.vendorBill,
                          billId: res.vendorBill.id,
                        });
                      }
                    },
                  },
                ],
              );
              fetchOrders();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to approve PO');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const handleReceiveGoods = async (order) => {
    const billState = order.vendorBill?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    if (!isBillValidated) {
      Alert.alert(
        'Invoice Validation Required',
        `Stock receipt cannot be validated yet!\n\nThe Vendor Bill (${order.vendorBill?.billNumber || 'Draft'}) must be validated before physical goods can be received into warehouse stock.\n\nWould you like to open and validate the Vendor Bill now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Vendor Bill',
            onPress: () => {
              if (order.vendorBill) {
                navigation.navigate(navigationScreen.VENDOR_BILL_DETAIL, {
                  bill: order.vendorBill,
                  billId: order.vendorBill.id,
                });
              } else {
                navigation.navigate(navigationScreen.VENDORS_BILLS);
              }
            },
          },
        ],
      );
      return;
    }

    Alert.alert(
      'Receive Goods (Validate Receipt)',
      `Receive physical goods for ${order.name}? This will mark the Stock Receipt & Moves as DONE and increase Warehouse on-hand stock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Receive & Update Stock',
          onPress: async () => {
            setActionLoadingId(order.id);
            try {
              await purchaseOrdersApi.receiveGoods(order.id);
              Alert.alert(
                'Stock Updated!',
                `Goods for ${order.name} received!\n\nWarehouse Stock Quants have been increased and stock valuation recorded.`,
              );
              fetchOrders();
            } catch (err) {
              Alert.alert('Validation Error', err?.response?.data?.message || 'Failed to receive goods');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ],
    );
  };

  const filteredOrders = Array.isArray(orders)
    ? orders.filter(item => {
        const itemState = item.state === 'billed' ? 'approved' : item.state;
        if (activeFilter !== 'all' && itemState !== activeFilter) {
          return false;
        }
        if (!search.trim()) return true;
        const query = search.toLowerCase();
        return (
          item.name?.toLowerCase().includes(query) ||
          item.vendor?.name?.toLowerCase().includes(query) ||
          item.division?.name?.toLowerCase().includes(query) ||
          item.warehouse?.name?.toLowerCase().includes(query)
        );
      })
    : [];

  const renderListItem = ({ item }) => {
    const typeMeta = ORDER_TYPE_LABELS[item.type] || ORDER_TYPE_LABELS.adhoc;
    const vendorName = item.vendor?.name || 'General Vendor';
    const locationName = item.warehouse?.name || item.division?.name || 'Main Warehouse';
    const formattedTotal = Number(item.amountTotal || item.totalAmount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const poNumber = item.name && !item.name.startsWith('RFQ') ? item.name : (item.name || 'Draft PO');
    const orderDate = item.orderDate ? formatDate(item.orderDate) : 'Today';

    return (
      <TouchableOpacity
        style={[styles.listCard, shadows.xs]}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate(navigationScreen.PURCHASE_ORDER_FORM, { order: item, orderId: item.id })
        }>
        <View style={styles.listCardHeader}>
          <View style={styles.listNumberGroup}>
            <Text style={styles.listPoNumber}>{poNumber}</Text>
            <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
              <Text style={[styles.typePillText, { color: typeMeta.fg }]}>{typeMeta.label}</Text>
            </View>
          </View>
          <StateBadge state={item.state} />
        </View>

        <View style={styles.listCardMiddle}>
          <View style={styles.listVendorCol}>
            <Text style={styles.listVendorText} numberOfLines={1}>
              🏢 {vendorName}
            </Text>
            <Text style={styles.listMetaText} numberOfLines={1}>
              📍 {locationName} • 📅 {orderDate}
            </Text>
          </View>

          <View style={styles.listAmountCol}>
            <Text style={styles.listAmountLabel}>Grand Total</Text>
            <Text style={styles.listAmountValue}>
              {item.currency || 'INR'} {formattedTotal}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderItem = ({ item }) => {
    const typeMeta = ORDER_TYPE_LABELS[item.type] || ORDER_TYPE_LABELS.adhoc;
    const vendorName = item.vendor?.name || 'General Vendor';
    const divisionName = item.division?.name || 'Main Division';
    const warehouseName = item.warehouse?.name || 'Main Warehouse';
    const formattedTotal = Number(item.amountTotal || item.totalAmount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const isActionLoading = actionLoadingId === item.id;
    const billState = item.vendorBill?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    return (
      <TouchableOpacity
        style={[styles.card, shadows.sm]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate(navigationScreen.PURCHASE_ORDER_FORM, { order: item, orderId: item.id })
        }>
        {/* Top Row: PO #, Type Pill & State */}
        <View style={styles.cardTopRow}>
          <View style={styles.poNumberBox}>
            <Text style={styles.poNumberText}>
              {item.name && !item.name.startsWith('RFQ') ? item.name : ''}
            </Text>
            <View style={[styles.typePill, { backgroundColor: typeMeta.bg }]}>
              <Text style={[styles.typePillText, { color: typeMeta.fg }]}>{typeMeta.label}</Text>
            </View>
          </View>
          <StateBadge state={item.state} />
        </View>

        {/* Vendor & Division Info */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🏢</Text>
            <Text style={styles.vendorText} numberOfLines={1}>
              {vendorName}
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
              Order: {item.orderDate ? formatDate(item.orderDate) : 'Today'}
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
              {item.currency || 'INR'} {formattedTotal}
            </Text>
          </View>
        </View>

        {/* Dynamic Workflow Action Buttons */}
        <View style={styles.actionRow}>
          {item.state === 'draft' && !item.name && (
            <TouchableOpacity
              style={styles.btnConfirm}
              activeOpacity={0.8}
              disabled={isActionLoading}
              onPress={() => handleConfirmOrder(item.id, item.name)}>
              <Text style={styles.btnConfirmText}>
                {isActionLoading ? 'Confirming...' : 'Confirm Order'}
              </Text>
            </TouchableOpacity>
          )}

          {item.state === 'draft' && Boolean(item.name) && (
            <TouchableOpacity
              style={styles.btnSendApproval}
              activeOpacity={0.8}
              disabled={isActionLoading}
              onPress={() => handleSendForApproval(item.id, item.name)}>
              <Text style={styles.btnSendApprovalText}>
                {isActionLoading ? 'Sending...' : 'Send for Approval →'}
              </Text>
            </TouchableOpacity>
          )}

          {item.state === 'to_approve' && (
            <TouchableOpacity
              style={styles.btnApprove}
              activeOpacity={0.8}
              disabled={isActionLoading}
              onPress={() => handleApproveOrder(item.id, item.name)}>
              <Text style={styles.btnApproveText}>
                {isActionLoading ? 'Approving...' : '✓ Approve PO '}
              </Text>
            </TouchableOpacity>
          )}

          {(item.state === 'approved' || item.state === 'billed') && (
            <View style={styles.approvedButtonGroup}>
              {item.vendorBill && (
                <TouchableOpacity
                  style={styles.btnBill}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate(navigationScreen.VENDOR_BILL_DETAIL, {
                      bill: item.vendorBill,
                      billId: item.vendorBill.id,
                    })
                  }>
                  <Text style={styles.btnBillText}>
                    🧾 View Bill: {item.vendorBill.billNumber || 'Draft Bill'} ›
                  </Text>
                </TouchableOpacity>
              )}

              {item.stockPicking && (
                item.stockPicking.state === 'done' ? (
                  <View style={styles.receiptDoneTag}>
                    <Text style={styles.receiptDoneTagText}>
                      ✓ Stock Received ({item.stockPicking.name})
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
                    onPress={() => handleReceiveGoods(item)}>
                    <Text
                      style={[
                        styles.btnReceiveText,
                        !isBillValidated && styles.btnReceiveTextLocked,
                      ]}>
                      {isActionLoading
                        ? 'Receiving...'
                        : isBillValidated
                        ? `📦 Receive Goods (${item.stockPicking.name}) →`
                        : `🔒 Validate Bill First to Receive Stock`}
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

  return (
    <ScreenContainer>
      <View style={styles.searchWrap}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search PO #, Vendor, or Division..."
        />
      </View>

      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={t => t.key}
          contentContainerStyle={styles.filterListContent}
          renderItem={({ item: tab }) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveFilter(tab.key)}>
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
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

      {loading && !refreshing ? (
        <LoadingOverlay />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id || item.name}
          renderItem={viewMode === 'list' ? renderListItem : renderOrderItem}
          contentContainerStyle={viewMode === 'list' ? styles.listModeContent : styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🛍️"
              title="No Purchase Orders"
              message={
                search
                  ? `No orders matching "${search}"`
                  : activeFilter !== 'all'
                  ? `No orders in "${activeFilter}" state`
                  : 'Tap "+ New PO" above to create an Adhoc Purchase Order'
              }
            />
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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
    marginBottom: spacing.xs,
  },
  viewOrderCount: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  toggleButtonGroup: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  viewToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  viewToggleBtnActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  viewToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  viewToggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listModeContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  listPoNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  listCardMiddle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listVendorCol: {
    flex: 1,
    marginRight: 10,
  },
  listVendorText: {
    ...typography.bodyBold,
    fontSize: 13,
    color: colors.text,
    marginBottom: 2,
  },
  listMetaText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  listAmountCol: {
    alignItems: 'flex-end',
  },
  listAmountLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    color: colors.textMuted,
    fontWeight: '600',
  },
  listAmountValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  poNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  poNumberText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 13,
    marginRight: 6,
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
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  dateBox: {
    flex: 1,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dateSubLabel: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
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
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  actionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  btnConfirm: {
    backgroundColor: colors.primaryLight,
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirmText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  btnSendApproval: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  btnSendApprovalText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  btnApprove: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  btnApproveText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  btnBill: {
    backgroundColor: '#E0F2FE',
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  btnBillText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  approvedButtonGroup: {
    gap: 6,
  },
  btnReceive: {
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  btnReceiveText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  btnReceiveLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  btnReceiveTextLocked: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  receiptDoneTag: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  receiptDoneTagText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  approvedTag: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  approvedTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
});
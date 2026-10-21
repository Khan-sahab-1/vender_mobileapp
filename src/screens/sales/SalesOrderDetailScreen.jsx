import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import HeaderActionButton from '../../components/HeaderActionButton';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { salesApi } from '../../api/sales';
import { colors, radius, spacing, typography, shadows } from '../../theme/theme';
import { formatDate } from '../../utils/dateUtils';

export default function SalesOrderDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSendForApproval = async () => {
    Alert.alert(
      'Send for Approval',
      `Send Sales Order ${order.soNumber || order.name} to management for approval?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send for Approval',
          onPress: async () => {
            try {
              setActionLoading(true);
              await salesApi.sendForApproval(order.id);
              Alert.alert('Success', 'Order sent for management approval!');
              const updated = await salesApi.getOrderDetail(order.id);
              setOrder(updated);
            } catch (err) {
              Alert.alert(
                'Error',
                err?.response?.data?.message || err?.message || 'Failed to send for approval',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Sale Order',
      `Approve Sales Order ${order.soNumber || order.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve Order',
          onPress: async () => {
            try {
              setActionLoading(true);
              await salesApi.approveOrder(order.id);
              Alert.alert('Order Approved!', 'Sales Order has been approved successfully.');
              const updated = await salesApi.getOrderDetail(order.id);
              setOrder(updated);
            } catch (err) {
              Alert.alert(
                'Approval Error',
                err?.response?.data?.message || err?.message || 'Failed to approve order',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Order',
      `Are you sure you want to cancel ${order.soNumber || order.name}?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(true);
              await salesApi.cancelOrder(order.id);
              Alert.alert('Cancelled', 'Order cancelled successfully.');
              const updated = await salesApi.getOrderDetail(order.id);
              setOrder(updated);
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to cancel order');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const isEditable = order && order.state !== 'done' && order.state !== 'cancel';

  const handleGoToEdit = () => {
    if (!order) return;
    navigation.navigate(navigationScreen.SALES_ORDER_FORM, {
      orderId: order.id,
      order,
    });
  };

  useLayoutEffect(() => {
    const title = order?.soNumber || order?.name || (id ? `SO #${id.slice(0, 8)}` : 'Sales Order');
    navigation.setOptions({
      title,
      headerRight: () =>
        isEditable ? (
          <HeaderActionButton title="✏️ Edit" onPress={handleGoToEdit} />
        ) : null,
    });
  }, [navigation, order, isEditable, id]);

  const fetchOrderDetail = async (showLoadingSpinner = false) => {
    if (!id) return;
    try {
      if (showLoadingSpinner) setLoading(true);
      const data = await salesApi.getOrderDetail(id);
      setOrder(data);
    } catch (err) {
      setError(err.message || 'Could not load Sales Order.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail(true);
  }, [id]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchOrderDetail(false);
    });
    return unsub;
  }, [navigation, id]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading Sales Order #{id}...</Text>
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorText}>⚠️ {error || 'Order not found'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatCurrency = val =>
    Number(val || 0).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    });

  const getStateBadge = state => {
    switch (state) {
      case 'draft':
        return { label: 'Quotation (Draft)', bg: '#FEF3C7', text: '#B45309' };
      case 'sent_for_approval':
      case 'to_approve':
        return { label: 'Pending Approval', bg: '#EDE9FE', text: '#7C3AED' };
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

  const badge = order ? getStateBadge(order.state) : {};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order Status Card */}
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.soNumber}>{order.soNumber}</Text>
            <Text style={styles.dateText}>Date: {order.date ? formatDate(order.date) : '—'}</Text>
          </View>
          <View style={styles.headerRightCol}>
            <View style={[styles.statePill, { backgroundColor: badge.bg }]}>
              <Text style={[styles.statePillText, { color: badge.text }]}>
                {badge.label?.toUpperCase()}
              </Text>
            </View>
            {isEditable && (
              <TouchableOpacity
                style={styles.quickEditBtn}
                onPress={handleGoToEdit}
                activeOpacity={0.7}>
                <Text style={styles.quickEditBtnText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer & Addresses */}
        <Text style={styles.sectionLabel}>CUSTOMER & DELIVERY</Text>
        <Text style={styles.customerName}>{order.customer}</Text>
        {order.poRefNo ? (
          <Text style={styles.metaRow}>🔖 Client PO #: {order.poRefNo}</Text>
        ) : null}
        {order.clientPoDate ? (
          <Text style={styles.metaRow}>📅 Client PO Date: {formatDate(order.clientPoDate)}</Text>
        ) : null}
        {order.deliveryAddress || order.shippingAddress ? (
          <Text style={styles.metaRow}>📍 Delivery: {order.deliveryAddress || order.shippingAddress}</Text>
        ) : null}
        {order.deliveryDate ? (
          <Text style={styles.metaRow}>
            🗓️ Delivery Date: {formatDate(order.deliveryDate)} ({order.deliveryDays || 0} days)
          </Text>
        ) : null}
        {order.warehouse?.name ? (
          <Text style={styles.metaRow}>🏢 Warehouse: {order.warehouse.name}</Text>
        ) : null}
        {order.division?.name ? (
          <Text style={styles.metaRow}>🏭 Division: {order.division.name}</Text>
        ) : null}
        {order.transporterName || order.transporter?.name ? (
          <Text style={styles.metaRow}>
            🚚 Transporter: {order.transporterName || order.transporter?.name}
          </Text>
        ) : null}
        {order.salesperson ? (
          <Text style={styles.metaRow}>👤 Salesperson: {order.salesperson}</Text>
        ) : null}
      </View>

      {/* Order Lines */}
      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.sectionLabel}>ORDER ITEMS ({order.lines?.length || 0})</Text>

        {order.lines && order.lines.length > 0 ? (
          order.lines.map((item, index) => (
            <View key={item.id || index} style={styles.itemRow}>
              <View style={styles.itemMain}>
                <Text style={styles.itemName}>{item.productName}</Text>
                {item.description && item.description !== item.productName ? (
                  <Text style={styles.itemDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.itemQty}>
                  Qty: {item.quantity} {item.uom} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyLinesText}>No line items recorded for this order.</Text>
        )}
      </View>

      {/* Financial Summary */}
      <View style={[styles.card, shadows.sm]}>
        <Text style={styles.sectionLabel}>TOTALS & ACCOUNTING</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Untaxed Amount:</Text>
          <Text style={styles.summaryVal}>{formatCurrency(order.untaxedAmount)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxes:</Text>
          <Text style={styles.summaryVal}>{formatCurrency(order.taxAmount)}</Text>
        </View>

        <View style={[styles.divider, { marginVertical: spacing.xs }]} />

        <View style={styles.summaryRow}>
          <Text style={styles.grandTotalLabel}>Grand Total:</Text>
          <Text style={styles.grandTotalVal}>{formatCurrency(order.totalAmount)}</Text>
        </View>

        {order.invoiceStatus ? (
          <View style={styles.invoiceStatusRow}>
            <Text style={styles.invoiceStatusLabel}>Invoice Status: </Text>
            <Text style={styles.invoiceStatusVal}>{order.invoiceStatus}</Text>
          </View>
        ) : null}

        {/* Workflow Actions */}
      

        {order.state === 'draft' && (
          <TouchableOpacity
            style={styles.btnSendApproval}
            onPress={handleSendForApproval}
            disabled={actionLoading}
            activeOpacity={0.8}>
            <Text style={styles.btnSendApprovalText}>
              {actionLoading ? 'Sending...' : '📤 Send for Approval →'}
            </Text>
          </TouchableOpacity>
        )}

        {(order.state === 'sent_for_approval' || order.state === 'to_approve') && (
          <View style={styles.actionRowGroup}>
            <TouchableOpacity
              style={styles.btnApproveOrder}
              onPress={handleApprove}
              disabled={actionLoading}
              activeOpacity={0.8}>
              <Text style={styles.btnApproveOrderText}>
                {actionLoading ? 'Approving...' : '✓ Approve Sale Order'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnCancelOrder}
              onPress={handleCancel}
              disabled={actionLoading}
              activeOpacity={0.8}>
              <Text style={styles.btnCancelOrderText}>✕ Reject / Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {(order.state === 'approved' || order.state === 'sale') && (
          <View style={styles.approvedStatusTag}>
            <Text style={styles.approvedStatusTagText}>
              ✓ Sale Order Approved & Confirmed
            </Text>
          </View>
        )}

        {order.state === 'cancel' && (
          <View style={styles.cancelledStatusTag}>
            <Text style={styles.cancelledStatusTagText}>
              ✕ Sale Order Cancelled
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  soNumber: {
    ...typography.h2,
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 18,
  },
  dateText: {
    ...typography.caption,
    color: '#64748B',
    marginTop: 2,
  },
  statePill: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  pillSale: {
    backgroundColor: '#DCFCE7',
  },
  pillDraft: {
    backgroundColor: '#FEF3C7',
  },
  statePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.sm + 2,
  },
  sectionLabel: {
    ...typography.tiny,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  customerName: {
    ...typography.bodyBold,
    color: '#0F172A',
    fontSize: 15,
    marginBottom: 4,
  },
  metaRow: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemMain: {
    flex: 1,
    marginRight: spacing.sm,
  },
  itemName: {
    ...typography.bodyBold,
    color: '#0F172A',
    fontSize: 14,
  },
  itemDesc: {
    ...typography.caption,
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  itemQty: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    fontWeight: '500',
  },
  itemSubtotal: {
    ...typography.bodyBold,
    color: '#0F172A',
    fontSize: 14,
  },
  emptyLinesText: {
    ...typography.caption,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  grandTotalLabel: {
    ...typography.bodyBold,
    color: '#0F172A',
    fontSize: 15,
  },
  grandTotalVal: {
    ...typography.h2,
    color: '#2563EB',
    fontSize: 18,
    fontWeight: '900',
  },
  invoiceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  invoiceStatusLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  invoiceStatusVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'capitalize',
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
  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  backBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtnText: {
    color: colors.text,
    fontWeight: '700',
  },
  headerRightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  quickEditBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  quickEditBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  btnEditOrder: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  btnEditOrderText: {
    color: '#1D4ED8',
    fontWeight: '800',
    fontSize: 14,
  },
  btnConfirmOrder: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  btnConfirmOrderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnSendApproval: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  btnSendApprovalText: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 14,
  },
  actionRowGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btnApproveOrder: {
    flex: 1.5,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnApproveOrderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnCancelOrder: {
    flex: 1,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelOrderText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  approvedStatusTag: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  approvedStatusTagText: {
    color: '#15803D',
    fontWeight: '800',
    fontSize: 13,
  },
  cancelledStatusTag: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  cancelledStatusTagText: {
    color: '#B91C1C',
    fontWeight: '800',
    fontSize: 13,
  },
});


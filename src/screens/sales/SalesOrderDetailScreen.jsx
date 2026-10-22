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
import StateBadge from '../../components/StateBadge';
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
              const updated = await salesApi.approveOrder(order.id);
              const bill = updated?.customerInvoice;
              const picking = updated?.stockPicking;
              Alert.alert(
                'SO Approved!',
                `Sales Order ${updated.name || updated.soNumber} approved!\n\n🧾 Customer Bill: ${bill?.invoiceNumber || 'Draft Bill'}\n📦 Delivery Order: ${picking?.name || 'Created'}\n\nInventory dispatch & Accounting entries are ready!`,
                [
                  { text: 'Stay Here', style: 'cancel' },
                  {
                    text: 'Open Customer Bill',
                    onPress: () => {
                      if (bill) {
                        navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                          invoice: bill,
                          invoiceId: bill.id,
                        });
                      } else {
                        navigation.navigate(navigationScreen.CUSTOMER_INVOICES);
                      }
                    },
                  },
                ],
              );
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

  const handleDeliverGoods = async () => {
    if (!order?.id) return;
    const billState = order.customerInvoice?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    if (!isBillValidated) {
      Alert.alert(
        'Invoice Validation Required',
        `Delivery cannot be validated yet!\n\nThe Customer Bill (${order.customerInvoice?.invoiceNumber || 'Draft'}) must be validated before physical goods can be delivered out of warehouse stock.\n\nWould you like to open and validate the Customer Bill now?`,
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

    setActionLoading(true);
    try {
      const updated = await salesApi.deliverGoods(order.id);
      setOrder(updated);
      Alert.alert(
        'Stock Updated!',
        `Goods delivered for ${updated.name || updated.soNumber}!\n\nDelivery ${updated?.stockPicking?.name || ''} validated and deducted from Warehouse on-hand stock.`,
      );
    } catch (err) {
      Alert.alert('Validation Error', err?.response?.data?.message || err?.message || 'Failed to deliver goods');
    } finally {
      setActionLoading(false);
    }
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

  const currentState = order.state || 'draft';
  const isApproved = currentState === 'approved' || currentState === 'sale';
  const isToApprove = currentState === 'to_approve' || currentState === 'sent_for_approval';
  const isDraft = currentState === 'draft';

  const billState = order.customerInvoice?.state?.toLowerCase();
  const isBillValidated =
    billState === 'open' || billState === 'posted' || billState === 'paid';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 1. STATE BANNER / STEPPER CARD (Matching PO Form Exactly) */}
      <View style={[styles.stepperCard, shadows.sm]}>
        <View style={styles.stepperTop}>
          <Text style={styles.stepperTitle}>{order.soNumber || order.name}</Text>
          <StateBadge state={currentState} />
        </View>

        <View style={styles.stepTrack}>
          <View style={[styles.stepDot, styles.stepActive]}>
            <Text style={styles.stepDotNum}>1</Text>
          </View>
          <Text style={styles.stepLabel}>Draft</Text>

          <View
            style={[
              styles.stepLine,
              (isToApprove || isApproved) && styles.stepLineActive,
            ]}
          />

          <View
            style={[
              styles.stepDot,
              (isToApprove || isApproved) && styles.stepActive,
            ]}>
            <Text style={styles.stepDotNum}>2</Text>
          </View>
          <Text style={styles.stepLabel}>To Approve</Text>

          <View
            style={[
              styles.stepLine,
              isApproved && styles.stepLineActive,
            ]}
          />

          <View
            style={[
              styles.stepDot,
              isApproved && styles.stepActiveSuccess,
            ]}>
            <Text style={styles.stepDotNum}>✓</Text>
          </View>
          <Text style={styles.stepLabel}>Approved</Text>
        </View>

        {/* Direct Bill Linked Button (Matching PO form) */}
        {order.customerInvoice && (
          <TouchableOpacity
            style={styles.linkedBillBtn}
            onPress={() =>
              navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                invoice: order.customerInvoice,
                invoiceId: order.customerInvoiceId || order.customerInvoice.id,
              })
            }>
            <Text style={styles.linkedBillBtnText}>
              🧾 View Generated Customer Bill: {order.customerInvoice.invoiceNumber || 'Draft Bill'} ›
            </Text>
          </TouchableOpacity>
        )}

        {/* Linked Stock Delivery & Goods Dispatch (Matching PO form) */}
        {order.stockPicking && (
          <View style={styles.linkedReceiptBox}>
            <View style={styles.linkedReceiptHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.linkedReceiptTitle}>
                  📦 Outgoing Delivery: {order.stockPicking.name}
                </Text>
                <Text style={styles.linkedReceiptSub}>
                  Destination: Customer Delivery Location
                </Text>
              </View>
              <StateBadge state={order.stockPicking.state} />
            </View>

            {order.stockPicking.state === 'done' ? (
              <View style={styles.receiptDoneBanner}>
                <Text style={styles.receiptDoneBannerText}>
                  ✓ Goods Delivered & Warehouse Stock Updated
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.btnReceiveGoods,
                  !isBillValidated && styles.btnReceiveGoodsLocked,
                ]}
                activeOpacity={0.8}
                disabled={actionLoading}
                onPress={handleDeliverGoods}>
                <Text
                  style={[
                    styles.btnReceiveGoodsText,
                    !isBillValidated && styles.btnReceiveGoodsTextLocked,
                  ]}>
                  {actionLoading
                    ? 'Delivering...'
                    : isBillValidated
                    ? '📦 Deliver Goods (Update Warehouse Stock) ✓'
                    : '🔒 Validate Bill First to Deliver Stock'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Workflow Action Buttons (Draft / Approval) */}
        {isDraft && (
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

        {isToApprove && (
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
      </View>

      {/* 2. CUSTOMER & DELIVERY DETAILS CARD */}
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionLabel}>CUSTOMER & DELIVERY DETAILS</Text>
          {isEditable && (
            <TouchableOpacity
              style={styles.quickEditBtn}
              onPress={handleGoToEdit}
              activeOpacity={0.7}>
              <Text style={styles.quickEditBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
          )}
        </View>

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
        {order.orderDate ? (
          <Text style={styles.metaRow}>📅 Order Date: {formatDate(order.orderDate)}</Text>
        ) : null}
      </View>

      {/* 3. ORDER ITEMS LINES CARD */}
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
                  Qty: {item.quantity} {item.uom || 'Unit'} × {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemSubtotal}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyLinesText}>No line items recorded for this order.</Text>
        )}
      </View>

      {/* 4. TOTALS & ACCOUNTING SUMMARY CARD */}
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
    gap: spacing.md,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepperCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepperTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepActiveSuccess: {
    backgroundColor: '#16A34A',
  },
  stepDotNum: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepLabel: {
    ...typography.tiny,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 6,
    marginRight: 8,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  linkedBillBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: radius.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  linkedBillBtnText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  linkedReceiptBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.xs,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  linkedReceiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkedReceiptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  linkedReceiptSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  receiptDoneBanner: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    borderRadius: radius.xs,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  receiptDoneBannerText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  btnReceiveGoods: {
    backgroundColor: '#16A34A',
    paddingVertical: 9,
    borderRadius: radius.xs,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  btnReceiveGoodsLocked: {
    backgroundColor: '#E2E8F0',
  },
  btnReceiveGoodsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnReceiveGoodsTextLocked: {
    color: '#64748B',
  },
  btnSendApproval: {
    backgroundColor: '#F59E0B',
    paddingVertical: 11,
    borderRadius: radius.xs,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnSendApprovalText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  actionRowGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btnApproveOrder: {
    flex: 2,
    backgroundColor: '#16A34A',
    paddingVertical: 11,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  btnApproveOrderText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  btnCancelOrder: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 11,
    borderRadius: radius.xs,
    alignItems: 'center',
  },
  btnCancelOrderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  quickEditBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  customerName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  metaRow: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  itemMain: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  itemName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  itemDesc: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemQty: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },
  itemSubtotal: {
    ...typography.bodyBold,
    color: colors.text,
  },
  emptyLinesText: {
    ...typography.caption,
    color: colors.textMuted,
    marginVertical: spacing.md,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  grandTotalLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  grandTotalVal: {
    ...typography.h3,
    fontWeight: '800',
    color: colors.primary,
  },
});

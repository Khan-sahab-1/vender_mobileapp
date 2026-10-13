import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { salesApi } from '../../api/sales';
import { colors, radius, spacing, typography, shadows } from '../../theme/theme';

export default function SalesOrderDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params || {};

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await salesApi.getOrderDetail(id);
        setOrder(data);
      } catch (err) {
        setError(err.message || 'Could not load Sales Order.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Order Status Card */}
      <View style={[styles.card, shadows.sm]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.soNumber}>{order.soNumber}</Text>
            <Text style={styles.dateText}>Date: {order.date ? order.date.slice(0, 19) : '—'}</Text>
          </View>
          <View style={[styles.statePill, order.state === 'sale' ? styles.pillSale : styles.pillDraft]}>
            <Text style={styles.statePillText}>{order.state?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Customer & Addresses */}
        <Text style={styles.sectionLabel}>CUSTOMER & DELIVERY</Text>
        <Text style={styles.customerName}>{order.customer}</Text>
        {order.invoiceAddress ? (
          <Text style={styles.metaRow}>🏢 Invoice: {order.invoiceAddress}</Text>
        ) : null}
        {order.shippingAddress ? (
          <Text style={styles.metaRow}>📍 Delivery: {order.shippingAddress}</Text>
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
});


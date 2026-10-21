import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { vendorPortalApi } from '../../api/vendorPortal';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';
import { formatDate } from '../../utils/dateUtils';

export default function VendorOrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await vendorPortalApi.getOrderDetail(orderId);
      setOrder(res);
    } catch {
      Alert.alert('Error', 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading || !order) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Order Details...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const isConfirmed = order.state === 'confirmed' || order.state === 'purchase';
  const lines = order.lines || [];

  return (
    <ScreenContainer>
      {/* Header Bar */}
      <View style={[styles.headerBar, shadows.xs]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.name}</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Order Info Card */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.poTitle}>{order.name}</Text>
              <Text style={styles.sourceText}>
                Purchase Order
              </Text>
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
                {String(order.state || 'draft').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Order Date</Text>
              <Text style={styles.metaVal}>
                {formatDate(order.dateOrder)}
              </Text>
            </View>

            {Boolean(order.datePlanned) && (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Delivery Due</Text>
                <Text style={styles.metaVal}>
                  {formatDate(order.datePlanned)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Items Table */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardHeaderTitle}>ORDERED ITEMS ({lines.length})</Text>

          {lines.length === 0 ? (
            <Text style={styles.noLinesText}>No items found on this order.</Text>
          ) : (
            lines.map((l, idx) => (
              <View key={l.id || idx} style={styles.lineItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineProdName}>
                    {l.productName || l.description || 'Product Item'}
                  </Text>
                  {Boolean(l.description && l.description !== l.productName) && (
                    <Text style={styles.lineDesc}>{l.description}</Text>
                  )}
                  <Text style={styles.lineQtyRate}>
                    Qty: {l.quantity || 1} {l.uom || 'Unit'} × ₹
                    {Number(l.unitPrice || 0).toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.lineSubtotal}>
                  ₹{Number(l.subtotal || (l.quantity * l.unitPrice) || 0).toLocaleString('en-IN')}
                </Text>
              </View>
            ))
          )}

          {/* Totals Section */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Untaxed Subtotal:</Text>
              <Text style={styles.totalsVal}>
                ₹{Number(order.amountUntaxed || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Taxes (GST):</Text>
              <Text style={styles.totalsVal}>
                ₹{Number(order.amountTax || 0).toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={[styles.totalsRow, styles.totalsRowGrand]}>
              <Text style={styles.grandLabel}>Total Order Value:</Text>
              <Text style={styles.grandVal}>
                ₹{Number(order.amountTotal || 0).toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes / Terms */}
        {Boolean(order.notes) && (
          <View style={[styles.card, shadows.sm]}>
            <Text style={styles.cardHeaderTitle}>TERMS & INSTRUCTIONS</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            activeOpacity={0.8}
            onPress={() =>
              Alert.alert(
                'Order Acknowledged',
                `Thank you! Purchase Order ${order.name} has been marked as acknowledged by your company.`
              )
            }>
            <Text style={styles.actionBtnPrimaryText}>✓ Acknowledge Order</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
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
  scrollContent: {
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
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  poTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  sourceText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  stateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  stateBadgeConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  stateBadgeConfirmedText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  stateBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  stateBadgeTextPending: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metaGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  cardHeaderTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  noLinesText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lineProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  lineDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  lineQtyRate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  lineSubtotal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  totalsBox: {
    marginTop: spacing.md,
    gap: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalsLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  totalsVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  totalsRowGrand: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 6,
  },
  grandLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  grandVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  notesText: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: spacing.sm,
  },
  actionBtnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
});


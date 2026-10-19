import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productsStockApi } from '../api/stock';
import { getErrorMessage } from '../api/client';
import { colors, radius, spacing, shadows, typography } from '../theme/theme';

export default function ProductStockModal({
  visible,
  productId,
  product,
  onClose,
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !productId) {
      setData(null);
      setError(null);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await productsStockApi.getLocationsStock(productId);
        if (isMounted) {
          setData(res);
        }
      } catch (e) {
        if (isMounted) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [visible, productId]);

  const prodInfo = data?.product || product || {};
  const totalOnHand = data?.totalOnHand ?? (product?.onHandQuantity ?? 0);
  const totalReserved = data?.totalReserved ?? 0;
  const totalAvailable = data?.totalAvailable ?? totalOnHand;
  const locations = data?.locations ?? [];
  const internalLocs = locations.filter(l => l.usage === 'internal');
  const otherLocs = locations.filter(l => l.usage !== 'internal' && l.quantity > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.flex1}>
            <Text style={styles.headerTitle}>Stock on Hand Breakdown</Text>
            <Text style={styles.headerSubtitle}>Physical location-wise inventory</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Product Header Card */}
          <View style={[styles.productCard, shadows.sm]}>
            <View style={styles.productIconWrap}>
              <Text style={styles.productIcon}>📦</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={styles.productName}>{prodInfo.name || 'Product'}</Text>
              <View style={styles.metaRow}>
                {prodInfo.sku ? (
                  <Text style={styles.skuText}>SKU: {prodInfo.sku}</Text>
                ) : null}
                {prodInfo.uom ? (
                  <Text style={styles.uomText}>UoM: {prodInfo.uom}</Text>
                ) : null}
              </View>
              {prodInfo.lotNumber ? (
                <View style={styles.lotBadge}>
                  <Text style={styles.lotBadgeText}>Lot/SN: {prodInfo.lotNumber}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Metric Summary Cards */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.metricCardOnHand]}>
              <Text style={styles.metricLabel}>On Hand (Total)</Text>
              <Text style={[styles.metricVal, styles.onHandText]}>
                {totalOnHand}
              </Text>
              <Text style={styles.metricSub}>{prodInfo.uom || 'Units'}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Reserved</Text>
              <Text style={[styles.metricVal, { color: colors.amber || '#D97706' }]}>
                {totalReserved}
              </Text>
              <Text style={styles.metricSub}>{prodInfo.uom || 'Units'}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Free Available</Text>
              <Text style={[styles.metricVal, { color: colors.primary }]}>
                {totalAvailable}
              </Text>
              <Text style={styles.metricSub}>{prodInfo.uom || 'Units'}</Text>
            </View>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loaderText}>Fetching location quantities...</Text>
            </View>
          ) : (
            <>
              {/* Internal Warehouse Locations Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Warehouse Locations</Text>
                <Text style={styles.sectionCount}>
                  {internalLocs.length} {internalLocs.length === 1 ? 'location' : 'locations'}
                </Text>
              </View>

              {internalLocs.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyIcon}>📍</Text>
                  <Text style={styles.emptyTitle}>No Stock in Warehouse</Text>
                  <Text style={styles.emptyDesc}>
                    This product currently has 0 quantity in all internal warehouse locations.
                  </Text>
                </View>
              ) : (
                internalLocs.map(loc => (
                  <View key={loc.quantId || loc.locationId} style={[styles.locationCard, shadows.sm]}>
                    <View style={styles.locHeader}>
                      <View style={styles.flex1}>
                        <Text style={styles.locName}>
                          📍 {loc.completeName || loc.locationName}
                        </Text>
                        <Text style={styles.locWarehouse}>
                          Warehouse: {loc.warehouseName}
                        </Text>
                      </View>
                      <View style={styles.locQtyBadge}>
                        <Text style={styles.locQtyVal}>{loc.quantity}</Text>
                        <Text style={styles.locQtyUnit}>{prodInfo.uom || 'Units'}</Text>
                      </View>
                    </View>

                    {/* Reserved & Available breakdown if reserved > 0 */}
                    {loc.reservedQuantity > 0 ? (
                      <View style={styles.locSubRow}>
                        <Text style={styles.locSubText}>
                          Reserved: {loc.reservedQuantity} • Available: {loc.availableQuantity}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}

              {/* Other Virtual Locations (if any stock) */}
              {otherLocs.length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: spacing.md }]}>
                    <Text style={styles.sectionTitle}>Virtual / Other Locations</Text>
                  </View>
                  {otherLocs.map(loc => (
                    <View key={loc.quantId || loc.locationId} style={styles.locationCardSubtle}>
                      <View style={styles.flex1}>
                        <Text style={styles.locNameSubtle}>{loc.completeName}</Text>
                        <Text style={styles.locUsageTag}>Type: {loc.usage}</Text>
                      </View>
                      <Text style={styles.locQtySubtle}>
                        {loc.quantity} {prodInfo.uom || 'Units'}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 16,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.md,
  },
  closeBtnText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 13,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  productIcon: {
    fontSize: 22,
  },
  productName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  skuText: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  uomText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  lotBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    marginTop: 4,
  },
  lotBadgeText: {
    fontSize: 10,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  metricCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  metricCardOnHand: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  onHandText: {
    color: '#057A60',
  },
  metricSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
  loaderBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loaderText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  locationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  locHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    fontSize: 14,
  },
  locWarehouse: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  locQtyBadge: {
    backgroundColor: '#E7F9F2',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  locQtyVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#057A60',
  },
  locQtyUnit: {
    fontSize: 9,
    fontWeight: '600',
    color: '#057A60',
  },
  locSubRow: {
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  locSubText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  locationCardSubtle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  locNameSubtle: {
    ...typography.captionBold,
    color: colors.text,
  },
  locUsageTag: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  locQtySubtle: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptyDesc: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  flex1: {
    flex: 1,
  },
});


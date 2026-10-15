import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import StateBadge from '../../components/StateBadge';
import PickerModal from '../../components/PickerModal';
import { LoadingOverlay, ErrorBanner } from '../../components/Feedback';
import { inventoryAdjustmentsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

export default function InventoryAdjustmentDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [adjustment, setAdjustment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [draftCounts, setDraftCounts] = useState({});
  const [savingLineId, setSavingLineId] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [addLineBusy, setAddLineBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await inventoryAdjustmentsApi.get(id);
      setAdjustment(data);
      const counts = {};
      (data.lines ?? []).forEach(line => {
        counts[line.id] =
          line.countedQuantity === null || line.countedQuantity === undefined
            ? ''
            : String(line.countedQuantity);
      });
      setDraftCounts(counts);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isDraft = adjustment?.state === 'draft';
  const isInProgress = adjustment?.state === 'in_progress';
  const isDone = adjustment?.state === 'done';
  const isCancelled = adjustment?.state === 'cancelled';
  const isEditable = isDraft || isInProgress;

  const saveLine = async lineId => {
    const value = draftCounts[lineId];
    if (value === '' || value === undefined) return;
    setSavingLineId(lineId);
    try {
      await inventoryAdjustmentsApi.updateLine(id, lineId, { countedQuantity: Number(value) });
      // Update in local state without full reload to prevent focus jump
      setAdjustment(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lines: prev.lines.map(l =>
            l.id === lineId ? { ...l, countedQuantity: Number(value) } : l,
          ),
        };
      });
    } catch (e) {
      Alert.alert("Couldn't save count", getErrorMessage(e));
    } finally {
      setSavingLineId(null);
    }
  };

  const handleStart = async () => {
    setBusy(true);
    setError(null);
    try {
      await inventoryAdjustmentsApi.start(id);
      await load();
    } catch (e) {
      Alert.alert("Couldn't start inventory", getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleValidate = () => {
    const lines = adjustment.lines ?? [];
    const uncounted = lines.filter(
      l => draftCounts[l.id] === '' || draftCounts[l.id] === undefined,
    );

    const proceed = async () => {
      setBusy(true);
      setError(null);
      try {
        await inventoryAdjustmentsApi.validate(id);
        await load();
        Alert.alert(
          'Inventory Validated',
          'Stock moves created and physical stock balances successfully updated!',
        );
      } catch (e) {
        Alert.alert("Couldn't validate inventory", getErrorMessage(e));
      } finally {
        setBusy(false);
      }
    };

    if (uncounted.length > 0) {
      Alert.alert(
        'Incomplete Physical Count',
        `${uncounted.length} item(s) have no counted quantity entered. Proceeding will treat them as zero quantity. Continue?`,
        [
          { text: 'Review Counts', style: 'cancel' },
          { text: 'Validate Anyway', style: 'destructive', onPress: proceed },
        ],
      );
    } else {
      Alert.alert(
        'Validate Inventory Adjustment',
        'This will create corrective stock moves and permanently update product stock balances. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Validate', onPress: proceed },
        ],
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Inventory Adjustment?',
      'Are you sure you want to cancel this count? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await inventoryAdjustmentsApi.cancel(id);
              await load();
            } catch (e) {
              Alert.alert("Couldn't cancel", getErrorMessage(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const handleAddProductLine = async item => {
    setShowAddLineModal(false);
    if (!item?.value) return;
    setAddLineBusy(true);
    try {
      const lot = item.record?.lotNumber || adjustment?.lotNumber || undefined;
      await inventoryAdjustmentsApi.addLine(id, {
        productId: item.value,
        locationId: adjustment?.locationId,
        lotNumber: lot,
      });
      await load();
    } catch (e) {
      Alert.alert("Couldn't add product line", getErrorMessage(e));
    } finally {
      setAddLineBusy(false);
    }
  };

  const handleDeleteLine = (lineId, productName) => {
    Alert.alert(
      'Remove Product Line',
      `Are you sure you want to remove "${productName || 'this item'}" from the count?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await inventoryAdjustmentsApi.deleteLine(id, lineId);
              await load();
            } catch (e) {
              Alert.alert("Couldn't remove line", getErrorMessage(e));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const adjustQty = (lineId, delta) => {
    const current = Number(draftCounts[lineId] || 0);
    const updated = Math.max(0, current + delta);
    setDraftCounts(prev => ({ ...prev, [lineId]: String(updated) }));
    setSavingLineId(lineId);
    inventoryAdjustmentsApi
      .updateLine(id, lineId, { countedQuantity: updated })
      .then(() => {
        setAdjustment(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            lines: prev.lines.map(l =>
              l.id === lineId ? { ...l, countedQuantity: updated } : l,
            ),
          };
        });
      })
      .catch(e => Alert.alert("Couldn't save count", getErrorMessage(e)))
      .finally(() => setSavingLineId(null));
  };

  if (loading || !adjustment) {
    return (
      <ScreenContainer>
        <LoadingOverlay full label="Loading inventory adjustment details..." />
      </ScreenContainer>
    );
  }

  // Calculate summary counts
  const lines = adjustment.lines || [];
  let discrepancyCount = 0;
  let gainCount = 0;
  let lossCount = 0;

  lines.forEach(l => {
    const countedVal = draftCounts[l.id];
    if (countedVal !== '' && countedVal !== undefined) {
      const diff = Number(countedVal) - Number(l.theoreticalQuantity ?? 0);
      if (diff > 0) gainCount++;
      else if (diff < 0) lossCount++;
      if (diff !== 0) discrepancyCount++;
    }
  });

  const filteredLines = searchFilter.trim()
    ? lines.filter(l => {
        const query = searchFilter.toLowerCase();
        return (
          l.product?.name?.toLowerCase().includes(query) ||
          l.product?.sku?.toLowerCase().includes(query) ||
          l.product?.barcode?.toLowerCase().includes(query)
        );
      })
    : lines;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ErrorBanner message={error} />

        {/* State Pipeline Indicator */}
        <View style={styles.pipelineCard}>
          <View style={styles.pipelineSteps}>
            <View
              style={[
                styles.stepItem,
                (isDraft || isInProgress || isDone) && styles.stepActive,
              ]}>
              <View
                style={[
                  styles.stepCircle,
                  (isDraft || isInProgress || isDone) && styles.stepCircleActive,
                ]}>
                <Text
                  style={[
                    styles.stepNumber,
                    (isDraft || isInProgress || isDone) && styles.stepNumberActive,
                  ]}>
                  1
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isDraft || isInProgress || isDone) && styles.stepLabelActive,
                ]}>
                Draft
              </Text>
            </View>

            <View
              style={[
                styles.stepConnector,
                (isInProgress || isDone) && styles.stepConnectorActive,
              ]}
            />

            <View
              style={[
                styles.stepItem,
                (isInProgress || isDone) && styles.stepActive,
              ]}>
              <View
                style={[
                  styles.stepCircle,
                  (isInProgress || isDone) && styles.stepCircleActive,
                ]}>
                <Text
                  style={[
                    styles.stepNumber,
                    (isInProgress || isDone) && styles.stepNumberActive,
                  ]}>
                  2
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isInProgress || isDone) && styles.stepLabelActive,
                ]}>
                In Progress
              </Text>
            </View>

            <View
              style={[
                styles.stepConnector,
                isDone && styles.stepConnectorActive,
              ]}
            />

            <View style={[styles.stepItem, isDone && styles.stepActive]}>
              <View style={[styles.stepCircle, isDone && styles.stepCircleActive]}>
                <Text style={[styles.stepNumber, isDone && styles.stepNumberActive]}>
                  3
                </Text>
              </View>
              <Text style={[styles.stepLabel, isDone && styles.stepLabelActive]}>
                Done
              </Text>
            </View>
          </View>
        </View>

        {/* Header Details Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.refText}>
                {adjustment.reference || adjustment.name || 'Adjustment'}
              </Text>
              <Text style={styles.dateText}>
                Date: {adjustment.inventoryDate || 'Today'}
              </Text>
            </View>
            <StateBadge state={adjustment.state} />
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Warehouse</Text>
              <Text style={styles.infoVal}>
                {adjustment.warehouse?.name || 'Default Warehouse'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Inventoried Location</Text>
              <Text style={styles.infoVal}>
                {adjustment.location?.completeName ||
                  adjustment.location?.name ||
                  'Internal Location'}
              </Text>
            </View>
          </View>

          <View style={[styles.infoGrid, { marginTop: spacing.sm }]}>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Inventory Type</Text>
              <Text style={styles.infoVal}>
                {adjustment.inventoryType === 'stock_journal'
                  ? 'Stock Journal'
                  : 'Stock Inventory'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Inventory Of</Text>
              <Text style={styles.infoVal}>
                {adjustment.inventoryOf === 'category'
                  ? `Category: ${adjustment.category?.name || 'Category'}`
                  : adjustment.inventoryOf === 'product'
                  ? `Product: ${adjustment.product?.name || 'Product'}`
                  : adjustment.inventoryOf === 'lot'
                  ? `Lot: ${adjustment.lotNumber || 'Lot'}`
                  : 'All Products'}
              </Text>
            </View>
          </View>

          {adjustment.notes ? (
            <View style={styles.notesWrap}>
              <Text style={styles.infoLabel}>Notes</Text>
              <Text style={styles.notesText}>{adjustment.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Controls */}
        <View style={styles.actionsCard}>
          {isDraft && (
            <View style={styles.actionRow}>
              <Button
                title="Start Inventory"
                onPress={handleStart}
                loading={busy}
                size="lg"
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <Button
                title="+ Add a line"
                variant="outline"
                onPress={() => setShowAddLineModal(true)}
                disabled={busy || addLineBusy}
                style={{ marginRight: spacing.sm }}
              />
              <Button
                title="Cancel"
                variant="ghost"
                onPress={handleCancel}
                disabled={busy}
              />
            </View>
          )}

          {isInProgress && (
            <View>
              <View style={styles.actionRow}>
                <Button
                  title="Validate Inventory"
                  onPress={handleValidate}
                  loading={busy}
                  size="lg"
                  style={[styles.validateBtn, { flex: 1, marginRight: spacing.sm }]}
                />
                <Button
                  title="+ Add a line"
                  variant="outline"
                  onPress={() => setShowAddLineModal(true)}
                  disabled={busy || addLineBusy}
                />
              </View>
              <TouchableOpacity
                onPress={handleCancel}
                disabled={busy}
                style={styles.cancelLink}>
                <Text style={styles.cancelLinkText}>Cancel Adjustment</Text>
              </TouchableOpacity>
            </View>
          )}

          {isDone && (
            <View style={styles.doneNotice}>
              <Text style={styles.doneIcon}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.doneTitle}>Inventory Validated</Text>
                <Text style={styles.doneDesc}>
                  Stock moves have booked all variances and on-hand quantities are now up to date.
                </Text>
              </View>
            </View>
          )}

          {isCancelled && (
            <View style={styles.cancelledNotice}>
              <Text style={styles.cancelledText}>
                This inventory adjustment was cancelled.
              </Text>
            </View>
          )}
        </View>

        {/* Count Summary Metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricVal}>{lines.length}</Text>
            <Text style={styles.metricLabel}>Total Items</Text>
          </View>
          <View style={styles.metricCard}>
            <Text
              style={[
                styles.metricVal,
                discrepancyCount > 0 && { color: colors.amber },
              ]}>
              {discrepancyCount}
            </Text>
            <Text style={styles.metricLabel}>Discrepancies</Text>
          </View>
          <View style={styles.metricCard}>
            <Text
              style={[
                styles.metricVal,
                gainCount > 0 && { color: colors.success },
              ]}>
              +{gainCount}
            </Text>
            <Text style={styles.metricLabel}>Surplus (Gain)</Text>
          </View>
          <View style={styles.metricCard}>
            <Text
              style={[
                styles.metricVal,
                lossCount > 0 && { color: colors.danger },
              ]}>
              -{lossCount}
            </Text>
            <Text style={styles.metricLabel}>Deficit (Loss)</Text>
          </View>
        </View>

        {/* Lines Header & Search Filter */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Physical Inventory Lines</Text>
            <Text style={styles.sectionCount}>
              {filteredLines.length} of {lines.length} items
            </Text>
          </View>
          {isEditable && (
            <TouchableOpacity
              style={styles.headerAddBtn}
              onPress={() => setShowAddLineModal(true)}
              disabled={busy || addLineBusy}>
              <Text style={styles.headerAddBtnText}>+ Add a line</Text>
            </TouchableOpacity>
          )}
        </View>

        {lines.length > 5 && (
          <View style={styles.searchBox}>
            <TextInput
              value={searchFilter}
              onChangeText={setSearchFilter}
              placeholder="Filter products by name or SKU..."
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
            {searchFilter ? (
              <TouchableOpacity onPress={() => setSearchFilter('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Empty lines indicator for draft */}
        {lines.length === 0 && isDraft && (
          <View style={styles.emptyLinesBox}>
            <Text style={styles.emptyLinesIcon}>📋</Text>
            <Text style={styles.emptyLinesTitle}>Inventory Not Started Yet</Text>
            <Text style={styles.emptyLinesDesc}>
              Tap &quot;+ Add a line&quot; to pick products manually, or &quot;Start Inventory&quot; to auto-populate all products in the selected scope with their theoretical stock.
            </Text>
            <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
              <Button
                title="Start Inventory Now"
                onPress={handleStart}
                loading={busy}
                style={{ marginRight: spacing.sm }}
              />
              <Button
                title="+ Add a line"
                variant="outline"
                onPress={() => setShowAddLineModal(true)}
                disabled={busy || addLineBusy}
              />
            </View>
          </View>
        )}

        {/* Lines List */}
        {filteredLines.map(line => {
          const counted = draftCounts[line.id];
          const hasCount = counted !== '' && counted !== undefined;
          const theoretical = Number(line.theoreticalQuantity ?? 0);
          const difference = hasCount ? Number(counted) - theoretical : 0;
          const lotVal = line.lotNumber || line.product?.lotNumber;

          return (
            <View key={line.id} style={[styles.lineCard, shadows.sm]}>
              <View style={styles.lineHeader}>
                <View style={{ flex: 1, marginRight: spacing.sm }}>
                  <Text style={styles.lineProductName}>
                    {line.product?.name || 'Unnamed Product'}
                  </Text>
                  <View style={styles.lineMetaRow}>
                    {line.product?.sku ? (
                      <Text style={styles.lineProductSku}>
                        SKU: {line.product.sku}
                      </Text>
                    ) : null}
                    {lotVal ? (
                      <View style={styles.lotBadge}>
                        <Text style={styles.lotBadgeText}>
                          Lot/SN: {lotVal}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Variance Badge */}
                {hasCount && (
                  <View
                    style={[
                      styles.diffBadge,
                      difference > 0 && styles.diffSurplus,
                      difference < 0 && styles.diffLoss,
                      difference === 0 && styles.diffZero,
                    ]}>
                    <Text
                      style={[
                        styles.diffText,
                        difference > 0 && styles.diffSurplusText,
                        difference < 0 && styles.diffLossText,
                        difference === 0 && styles.diffZeroText,
                      ]}>
                      Diff: {difference > 0 ? `+${difference}` : difference}
                    </Text>
                  </View>
                )}

                {/* Delete Line */}
                {isEditable && (
                  <TouchableOpacity
                    style={styles.deleteLineBtn}
                    onPress={() =>
                      handleDeleteLine(line.id, line.product?.name)
                    }
                    disabled={busy}>
                    <Text style={styles.deleteLineBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Counts comparison row */}
              <View style={styles.lineCountsRow}>
                {/* Theoretical Qty */}
                <View style={styles.countColumn}>
                  <Text style={styles.countColumnLabel}>Theoretical Qty</Text>
                  <Text style={styles.countColumnVal}>{theoretical}</Text>
                </View>

                {/* Arrow */}
                <Text style={styles.countArrow}>➔</Text>

                {/* Real Quantity */}
                <View style={styles.countColumn}>
                  <Text style={styles.countColumnLabel}>Real Quantity</Text>
                  <Text style={styles.countColumnSub}>(Counted)</Text>
                  {isEditable ? (
                    <View style={styles.inputWrap}>
                      <TouchableOpacity
                        style={styles.qtyStepBtn}
                        onPress={() => adjustQty(line.id, -1)}>
                        <Text style={styles.qtyStepText}>-</Text>
                      </TouchableOpacity>

                      <TextInput
                        value={counted}
                        onChangeText={text =>
                          setDraftCounts(prev => ({
                            ...prev,
                            [line.id]: text.replace(/[^0-9.-]/g, ''),
                          }))
                        }
                        onBlur={() => saveLine(line.id)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        style={styles.countInput}
                      />

                      <TouchableOpacity
                        style={styles.qtyStepBtn}
                        onPress={() => adjustQty(line.id, 1)}>
                        <Text style={styles.qtyStepText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.countColumnVal}>{counted || '0'}</Text>
                  )}
                </View>
              </View>

              {savingLineId === line.id ? (
                <View style={styles.savingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.savingText}>Saving count...</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      {/* Add Product Line Picker Modal */}
      <PickerModal
        visible={showAddLineModal}
        onClose={() => setShowAddLineModal(false)}
        onSelect={handleAddProductLine}
        title="Add Product to Inventory"
        relation="products"
        params={{
          companyId: adjustment?.companyId || user?.companyId,
          strict: true,
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  pipelineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  pipelineSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  stepNumberActive: {
    color: colors.surface,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
    marginBottom: 16,
  },
  stepConnectorActive: {
    backgroundColor: colors.primary,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 2,
  },
  refText: {
    ...typography.h3,
    color: colors.text,
  },
  dateText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    fontSize: 11,
  },
  infoVal: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    marginTop: 2,
  },
  notesWrap: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesText: {
    ...typography.caption,
    color: colors.text,
    marginTop: 2,
  },
  actionsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validateBtn: {
    backgroundColor: colors.success || '#057A60',
  },
  cancelLink: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  cancelLinkText: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '600',
  },
  doneNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E7F9F2',
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
  },
  doneIcon: {
    fontSize: 20,
    color: '#057A60',
    fontWeight: 'bold',
    marginRight: spacing.sm,
  },
  doneTitle: {
    ...typography.label,
    color: '#057A60',
    fontWeight: '700',
  },
  doneDesc: {
    ...typography.caption,
    color: '#057A60',
    marginTop: 2,
  },
  cancelledNotice: {
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  cancelledText: {
    ...typography.body,
    color: colors.danger,
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
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  metricVal: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 16,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 38,
    ...typography.body,
    color: colors.text,
  },
  clearSearch: {
    fontSize: 14,
    color: colors.textMuted,
    padding: 6,
  },
  emptyLinesBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  emptyLinesIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyLinesTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  emptyLinesDesc: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  lineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  lineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  lineProductName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  lineProductSku: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  diffBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  diffSurplus: {
    backgroundColor: '#E7F9F2',
  },
  diffSurplusText: {
    color: '#057A60',
    fontWeight: '700',
    fontSize: 12,
  },
  diffLoss: {
    backgroundColor: '#FFEAEA',
  },
  diffLossText: {
    color: '#B42323',
    fontWeight: '700',
    fontSize: 12,
  },
  diffZero: {
    backgroundColor: colors.surfaceSubtle,
  },
  diffZeroText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  diffText: {
    ...typography.caption,
  },
  lineCountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  countColumn: {
    flex: 1,
    alignItems: 'center',
  },
  countColumnLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  countColumnVal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  countArrow: {
    fontSize: 14,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyStepBtn: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  countInput: {
    width: 52,
    height: 32,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 4,
    padding: 0,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  savingText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 4,
  },
  headerAddBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  headerAddBtnText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 12,
  },
  lineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    flexWrap: 'wrap',
  },
  lotBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
    marginLeft: spacing.xs,
  },
  lotBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  deleteLineBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.xs,
  },
  deleteLineBtnText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
  },
  countColumnSub: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
});

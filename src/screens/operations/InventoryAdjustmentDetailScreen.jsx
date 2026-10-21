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
import { formatDate } from '../../utils/dateUtils';

export default function InventoryAdjustmentDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [adjustment, setAdjustment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [draftAdjustments, setDraftAdjustments] = useState({});
  const [draftReasons, setDraftReasons] = useState({});
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
      const adjustments = {};
      const reasons = {};
      (data.lines ?? []).forEach(line => {
        const theoretical = Number(line.theoreticalQuantity || 0);
        let adjVal = 0;
        if (
          line.adjustmentQuantity !== null &&
          line.adjustmentQuantity !== undefined
        ) {
          adjVal = Number(line.adjustmentQuantity);
        } else if (
          line.countedQuantity !== null &&
          line.countedQuantity !== undefined
        ) {
          adjVal = Number(line.countedQuantity) - theoretical;
        }
        adjustments[line.id] = String(adjVal);
        reasons[line.id] = line.reason || '';
      });
      setDraftAdjustments(adjustments);
      setDraftReasons(reasons);
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

  const saveLine = async (lineId, explicitReason) => {
    const rawVal = draftAdjustments[lineId];
    if (rawVal === '' || rawVal === undefined || rawVal === '-') return;
    const adjNum = Number(rawVal);
    const line = (adjustment?.lines || []).find(l => l.id === lineId);
    const theoretical = Number(line?.theoreticalQuantity || 0);
    const reasonToSave =
      explicitReason !== undefined ? explicitReason : draftReasons[lineId];
    setSavingLineId(lineId);
    try {
      await inventoryAdjustmentsApi.updateLine(id, lineId, {
        adjustmentQuantity: adjNum,
        reason: reasonToSave || undefined,
      });
      // Update in local state without full reload to prevent focus jump
      setAdjustment(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lines: prev.lines.map(l =>
            l.id === lineId
              ? {
                  ...l,
                  adjustmentQuantity: adjNum,
                  countedQuantity: theoretical + adjNum,
                  reason: reasonToSave,
                }
              : l,
          ),
        };
      });
    } catch (e) {
      Alert.alert("Couldn't save adjustment", getErrorMessage(e));
    } finally {
      setSavingLineId(null);
    }
  };

  const handleSelectReason = (lineId, reasonText) => {
    setDraftReasons(prev => ({ ...prev, [lineId]: reasonText }));
    saveLine(lineId, reasonText);
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

    // Check if any negative adjustment line has no reason provided
    const negativeLinesWithoutReason = lines.filter(l => {
      const adj = Number(draftAdjustments[l.id] ?? l.adjustmentQuantity ?? 0);
      const reason = (draftReasons[l.id] || l.reason || '').trim();
      return adj < 0 && !reason;
    });

    if (negativeLinesWithoutReason.length > 0) {
      const prodNames = negativeLinesWithoutReason
        .map(l => l.product?.name || 'Product')
        .join(', ');
      Alert.alert(
        'Reason Required for Minus Stock',
        `Stock is being reduced for:\n${prodNames}\n\nPlease select or enter a reason (e.g. Damaged, Expired, Lost) before validating.`,
      );
      return;
    }

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

    Alert.alert(
      'Validate Inventory Adjustment',
      'This will create corrective stock moves and permanently update product stock balances. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Validate', onPress: proceed },
      ],
    );
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
        adjustmentQuantity: 0,
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
    const line = (adjustment?.lines || []).find(l => l.id === lineId);
    const theoretical = Number(line?.theoreticalQuantity || 0);
    const current = Number(draftAdjustments[lineId] || 0);
    // Don't allow reducing below -theoretical (stock can't be negative)
    const updated = Math.max(-theoretical, current + delta);
    setDraftAdjustments(prev => ({ ...prev, [lineId]: String(updated) }));
    setSavingLineId(lineId);
    inventoryAdjustmentsApi
      .updateLine(id, lineId, {
        adjustmentQuantity: updated,
        reason: draftReasons[lineId] || undefined,
      })
      .then(() => {
        setAdjustment(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            lines: prev.lines.map(l =>
              l.id === lineId
                ? {
                    ...l,
                    adjustmentQuantity: updated,
                    countedQuantity: theoretical + updated,
                  }
                : l,
            ),
          };
        });
      })
      .catch(e => Alert.alert("Couldn't save adjustment", getErrorMessage(e)))
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
    const rawVal = draftAdjustments[l.id];
    if (rawVal !== '' && rawVal !== undefined && rawVal !== '-') {
      const diff = Number(rawVal);
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
                Date: {adjustment.inventoryDate ? formatDate(adjustment.inventoryDate) : 'Today'}
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
                  Double-entry stock moves have booked all variances between the warehouse location and Virtual Locations / Inventory Adjustment.
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
          const theoretical = Number(line.theoreticalQuantity ?? 0);
          const rawAdj = draftAdjustments[line.id];
          const hasAdj = rawAdj !== '' && rawAdj !== undefined && rawAdj !== '-';
          const adj = hasAdj ? Number(rawAdj) : 0;
          const newOnHand = theoretical + adj;
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
                <View
                  style={[
                    styles.diffBadge,
                    adj > 0 && styles.diffSurplus,
                    adj < 0 && styles.diffLoss,
                    adj === 0 && styles.diffZero,
                  ]}>
                  <Text
                    style={[
                      styles.diffText,
                      adj > 0 && styles.diffSurplusText,
                      adj < 0 && styles.diffLossText,
                      adj === 0 && styles.diffZeroText,
                    ]}>
                    {adj > 0
                      ? `+${adj} (Add)`
                      : adj < 0
                      ? `${adj} (Deduct)`
                      : '0 (No Change)'}
                  </Text>
                </View>

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

              {/* Counts comparison row: Current On Hand -> Adjust (+/-) -> New On Hand */}
              <View style={styles.lineCountsRow}>
                {/* Theoretical Qty */}
                <View style={styles.countColumn}>
                  <Text style={styles.countColumnLabel}>Current On Hand</Text>
                  <Text style={styles.countColumnVal}>{theoretical}</Text>
                </View>

                {/* Arrow */}
                <Text style={styles.countArrow}>➔</Text>

                {/* Adjust (+/-) */}
                <View style={styles.countColumn}>
                  <Text style={styles.countColumnLabel}>Adjust (+/-)</Text>
                  <Text style={styles.countColumnSub}>0 = No change</Text>
                  {isEditable ? (
                    <View style={styles.inputWrap}>
                      <TouchableOpacity
                        style={styles.qtyStepBtn}
                        onPress={() => adjustQty(line.id, -1)}>
                        <Text style={styles.qtyStepText}>-</Text>
                      </TouchableOpacity>

                      <TextInput
                        value={draftAdjustments[line.id] ?? '0'}
                        onChangeText={text => {
                          setDraftAdjustments(prev => ({
                            ...prev,
                            [line.id]: text,
                          }));
                        }}
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
                    <Text style={styles.countColumnVal}>
                      {adj > 0 ? `+${adj}` : adj}
                    </Text>
                  )}
                </View>

                {/* Equals */}
                <Text style={styles.countArrow}>=</Text>

                {/* New On Hand */}
                <View style={styles.countColumn}>
                  <Text style={styles.countColumnLabel}>New On Hand</Text>
                  <Text style={styles.countColumnSub}>(Resulting)</Text>
                  <Text
                    style={[
                      styles.countColumnVal,
                      adj > 0 && { color: colors.success, fontWeight: '800' },
                      adj < 0 && { color: colors.danger, fontWeight: '800' },
                    ]}>
                    {newOnHand}
                  </Text>
                </View>
              </View>

              {/* If minus (stock reduction): prompt / require reason */}
              {adj < 0 && (
                <View style={styles.reasonCardBox}>
                  <View style={styles.reasonHeaderRow}>
                    <Text style={styles.reasonTitle}>
                      ⚠️ Reason for Stock Reduction (Required)
                    </Text>
                  </View>
                  <Text style={styles.reasonSubtitle}>
                    Why are {Math.abs(adj)} unit(s) being deducted? Select or type reason:
                  </Text>
                  {isEditable ? (
                    <>
                      <View style={styles.reasonChipsWrap}>
                        {[
                          'Damaged / Broken',
                          'Expired',
                          'Lost / Stolen',
                          'Physical Recount',
                          'Scrap / Wastage',
                        ].map(preset => {
                          const currentReason =
                            draftReasons[line.id] !== undefined
                              ? draftReasons[line.id]
                              : line.reason;
                          const isSelected = currentReason === preset;
                          return (
                            <TouchableOpacity
                              key={preset}
                              style={[
                                styles.reasonChip,
                                isSelected && styles.reasonChipSelected,
                              ]}
                              onPress={() => handleSelectReason(line.id, preset)}>
                              <Text
                                style={[
                                  styles.reasonChipText,
                                  isSelected && styles.reasonChipTextSelected,
                                ]}>
                                {preset}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                      <TextInput
                        style={styles.reasonInput}
                        value={
                          draftReasons[line.id] !== undefined
                            ? draftReasons[line.id]
                            : line.reason || ''
                        }
                        onChangeText={text =>
                          setDraftReasons(prev => ({ ...prev, [line.id]: text }))
                        }
                        onBlur={() => saveLine(line.id)}
                        placeholder="Or enter custom reason / remarks..."
                        placeholderTextColor={colors.textMuted}
                      />
                    </>
                  ) : (
                    <Text style={styles.reasonReadonlyText}>
                      Reason: <Text style={styles.reasonReadonlyVal}>{line.reason || 'Not specified'}</Text>
                    </Text>
                  )}
                </View>
              )}

              {/* Double-Entry Stock Movement Display */}
              {adj !== 0 ? (
                isDone ? (
                  <View style={styles.stockMoveBox}>
                    <View style={styles.stockMoveHeader}>
                      <Text style={styles.stockMoveTag}>📦 Stock Move (Double-Entry)</Text>
                      <View style={styles.moveStateBadge}>
                        <Text style={styles.moveStateText}>DONE</Text>
                      </View>
                    </View>
                    <View style={styles.stockMoveRoute}>
                      <View style={styles.routeCol}>
                        <Text style={styles.routeLabel}>Source</Text>
                        <Text style={styles.routeLocName} numberOfLines={1}>
                          {line.stockMove?.sourceLocation?.completeName ||
                            line.stockMove?.sourceLocation?.name ||
                            (adj > 0
                              ? 'Virtual Locations/Inventory Adjustment'
                              : line.location?.completeName ||
                                line.location?.name ||
                                adjustment.location?.completeName ||
                                adjustment.location?.name ||
                                'apex 1 / stock')}
                        </Text>
                      </View>
                      <Text style={styles.routeArrow}>➔</Text>
                      <View style={styles.routeCol}>
                        <Text style={styles.routeLabel}>Destination</Text>
                        <Text style={styles.routeLocName} numberOfLines={1}>
                          {line.stockMove?.destLocation?.completeName ||
                            line.stockMove?.destLocation?.name ||
                            (adj > 0
                              ? line.location?.completeName ||
                                line.location?.name ||
                                adjustment.location?.completeName ||
                                adjustment.location?.name ||
                                'apex 1 / stock'
                              : 'Virtual Locations/Inventory Adjustment')}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.stockMoveQtyText}>
                      Moved: <Text style={{ fontWeight: '700' }}>{Math.abs(adj)} Units</Text>{' '}
                      {adj > 0 ? '(+ Added to warehouse)' : '(- Deducted from warehouse)'}
                    </Text>
                    {line.reason ? (
                      <Text style={styles.stockMoveReasonText}>
                        📝 Reason: <Text style={styles.stockMoveReasonVal}>{line.reason}</Text>
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.stockMovePreviewBox}>
                    <Text style={styles.previewTitle}>
                      ⚡ Double-Entry Move on Validate:
                    </Text>
                    <View style={styles.previewRouteRow}>
                      <Text style={styles.previewLoc} numberOfLines={1}>
                        {adj > 0
                          ? 'Virtual Locations/Inventory Adjustment'
                          : line.location?.name || adjustment.location?.name || 'apex 1 / stock'}
                      </Text>
                      <Text style={styles.previewArrow}> ➔ </Text>
                      <Text style={styles.previewLoc} numberOfLines={1}>
                        {adj > 0
                          ? line.location?.name || adjustment.location?.name || 'apex 1 / stock'
                          : 'Virtual Locations/Inventory Adjustment'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.previewQty,
                        adj > 0 ? styles.gainText : styles.lossText,
                      ]}>
                      {adj > 0
                        ? `+${adj} Units will be added to warehouse`
                        : `${Math.abs(adj)} Units will be deducted from warehouse`}
                    </Text>
                  </View>
                )
              ) : null}

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
  stockMoveBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: spacing.xs + 3,
    marginTop: spacing.xs + 4,
  },
  stockMoveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockMoveTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  moveStateBadge: {
    backgroundColor: '#E7F9F2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  moveStateText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#057A60',
  },
  stockMoveRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xs,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routeCol: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  routeLocName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  routeArrow: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
    marginHorizontal: spacing.xs,
  },
  stockMoveQtyText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  stockMovePreviewBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.xs + 3,
    marginTop: spacing.xs + 4,
  },
  previewTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  previewRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  previewLoc: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E40AF',
    maxWidth: '45%',
  },
  previewArrow: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: 'bold',
  },
  previewQty: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  gainText: {
    color: '#057A60',
  },
  lossText: {
    color: '#B42323',
  },
  reasonCardBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: spacing.sm,
    marginTop: spacing.xs + 3,
  },
  reasonHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  reasonTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  reasonSubtitle: {
    fontSize: 10,
    color: '#7F1D1D',
    marginBottom: spacing.xs,
  },
  reasonChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.xs,
  },
  reasonChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: spacing.sm - 1,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  reasonChipSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  reasonChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B91C1C',
  },
  reasonChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    fontSize: 11,
    color: colors.text,
  },
  reasonReadonlyText: {
    fontSize: 11,
    color: '#7F1D1D',
    marginTop: 2,
  },
  reasonReadonlyVal: {
    fontWeight: '700',
    color: '#B91C1C',
  },
  stockMoveReasonText: {
    fontSize: 10,
    color: '#991B1B',
    marginTop: 2,
  },
  stockMoveReasonVal: {
    fontWeight: '700',
  },
});

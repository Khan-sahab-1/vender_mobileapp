import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, TextInput, Alert, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import StateBadge from '../../components/StateBadge';
import { LoadingOverlay, ErrorBanner } from '../../components/Feedback';
import { inventoryAdjustmentsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function InventoryAdjustmentDetailScreen({ route }) {
  const { id } = route.params;
  const [adjustment, setAdjustment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [draftCounts, setDraftCounts] = useState({});
  const [savingLineId, setSavingLineId] = useState(null);

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

  const saveLine = async lineId => {
    const value = draftCounts[lineId];
    if (value === '' || value === undefined) return;
    setSavingLineId(lineId);
    try {
      await inventoryAdjustmentsApi.updateLine(id, lineId, { countedQuantity: Number(value) });
      await load();
    } catch (e) {
      Alert.alert("Couldn't save count", getErrorMessage(e));
    } finally {
      setSavingLineId(null);
    }
  };

  const handleValidate = () => {
    const uncounted = (adjustment.lines ?? []).filter(
      l => draftCounts[l.id] === '' || draftCounts[l.id] === undefined,
    );
    const proceed = async () => {
      setBusy(true);
      setError(null);
      try {
        await inventoryAdjustmentsApi.validate(id);
        await load();
      } catch (e) {
        Alert.alert("Couldn't validate", getErrorMessage(e));
      } finally {
        setBusy(false);
      }
    };
    if (uncounted.length) {
      Alert.alert(
        'Incomplete Count',
        `${uncounted.length} line(s) have no counted quantity and will be skipped. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Validate Anyway', onPress: proceed },
        ],
      );
    } else {
      proceed();
    }
  };

  const handleCancel = () =>
    Alert.alert('Cancel this adjustment?', 'This cannot be undone.', [
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
    ]);

  if (loading || !adjustment) {
    return (
      <ScreenContainer>
        <LoadingOverlay full label="Loading adjustment details..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ErrorBanner message={error} />

        {/* Summary Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.name}>{adjustment.name || 'Stock Adjustment'}</Text>
            <StateBadge state={adjustment.state} />
          </View>
          {adjustment.notes ? <Text style={styles.notes}>{adjustment.notes}</Text> : null}
        </View>

        {/* Lines Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Count Lines</Text>
          <Text style={styles.sectionCount}>
            {adjustment.lines?.length ?? 0} {adjustment.lines?.length === 1 ? 'line' : 'lines'}
          </Text>
        </View>

        {(adjustment.lines ?? []).map(line => {
          const counted = draftCounts[line.id];
          const hasCount = counted !== '' && counted !== undefined;
          const theoretical = Number(line.theoreticalQuantity ?? 0);
          const difference = hasCount ? Number(counted) - theoretical : null;

          return (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineTop}>
                <Text style={styles.lineProduct}>{line.product?.name}</Text>
                {hasCount ? (
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
                      ]}>
                      {difference > 0 ? `+${difference}` : difference}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.lineLocation}>
                {line.warehouse?.name ?? line.location?.completeName ?? line.location?.name ?? 'Default Location'}
              </Text>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>System (On Hand)</Text>
                  <Text style={styles.statValue}>{theoretical}</Text>
                </View>

                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Physical Count</Text>
                  {isDraft ? (
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
                      placeholder="Enter count"
                      placeholderTextColor={colors.textMuted}
                      selectionColor={colors.primary}
                      style={styles.countInput}
                    />
                  ) : (
                    <Text style={styles.statValue}>{counted || '—'}</Text>
                  )}
                </View>
              </View>

              {savingLineId === line.id ? (
                <Text style={styles.savingHint}>Saving count...</Text>
              ) : null}
            </View>
          );
        })}

        {/* Actions */}
        {isDraft && (
          <View style={styles.actionSection}>
            <Button
              title="Validate Adjustment"
              onPress={handleValidate}
              loading={busy}
              size="lg"
            />
            <Button
              title="Cancel Adjustment"
              onPress={handleCancel}
              loading={busy}
              variant="ghost"
              style={styles.cancelBtn}
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
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
    alignItems: 'center',
  },
  name: {
    ...typography.h2,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  notes: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionCount: {
    ...typography.caption,
    color: colors.textMuted,
  },
  lineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  lineTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lineProduct: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  lineLocation: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 4,
    fontSize: 11,
  },
  statValue: {
    ...typography.h3,
    color: colors.text,
  },
  countInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    color: colors.text,
    ...typography.bodyBold,
  },
  diffBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  diffSurplus: {
    backgroundColor: colors.secondarySoft,
  },
  diffSurplusText: {
    color: '#057A60',
  },
  diffLoss: {
    backgroundColor: colors.dangerSoft,
  },
  diffLossText: {
    color: '#B42323',
  },
  diffZero: {
    backgroundColor: colors.surfaceSubtle,
  },
  diffText: {
    ...typography.captionBold,
    fontSize: 12,
  },
  savingHint: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  actionSection: {
    marginTop: spacing.md,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});

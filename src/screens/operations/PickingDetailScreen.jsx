import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, Alert, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import StateBadge from '../../components/StateBadge';
import { LoadingOverlay, ErrorBanner } from '../../components/Feedback';
import { stockPickingsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function PickingDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [picking, setPicking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stockPickingsApi.get(id);
      setPicking(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (label, action) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      Alert.alert(`Couldn't ${label}`, getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = () => runAction('confirm', () => stockPickingsApi.confirm(id));
  const handleValidate = () => runAction('validate', () => stockPickingsApi.validate(id));
  const handleCancel = () =>
    Alert.alert('Cancel this transfer?', 'This cannot be undone.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => runAction('cancel', () => stockPickingsApi.cancel(id)),
      },
    ]);
  const handleReturn = () =>
    runAction('create return', async () => {
      const returned = await stockPickingsApi.createReturn(id);
      navigation.replace('PickingDetail', { id: returned.id });
    });

  if (loading || !picking) {
    return (
      <ScreenContainer>
        <LoadingOverlay full label="Loading transfer details..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <ErrorBanner message={error} />

        {/* Header Summary Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <Text style={styles.name}>{picking.name}</Text>
            <StateBadge state={picking.state} />
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.locationBox}>
              <Text style={styles.locationLabel}>Source</Text>
              <Text style={styles.locationName}>
                {picking.sourceLocation?.name || '—'}
              </Text>
            </View>
            <Text style={styles.routeArrow}>➔</Text>
            <View style={styles.locationBox}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationName}>
                {picking.destLocation?.name || '—'}
              </Text>
            </View>
          </View>

          <View style={styles.metaList}>
            {picking.partner?.name ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Partner:</Text>
                <Text style={styles.metaValue}>{picking.partner.name}</Text>
              </View>
            ) : null}
            {picking.origin ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Reference:</Text>
                <Text style={styles.metaValue}>{picking.origin}</Text>
              </View>
            ) : null}
            {picking.warehouse?.name ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Warehouse:</Text>
                <Text style={styles.metaValue}>{picking.warehouse.name}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Product Moves */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Products in Transfer</Text>
          <Text style={styles.sectionCount}>
            {picking.moves?.length ?? 0} {picking.moves?.length === 1 ? 'item' : 'items'}
          </Text>
        </View>

        {(picking.moves ?? []).map(move => (
          <View key={move.id} style={styles.moveCard}>
            <View style={styles.moveTop}>
              <Text style={styles.moveProduct}>{move.product?.name || 'Product'}</Text>
              <StateBadge state={move.state} />
            </View>
            <View style={styles.moveQtyWrap}>
              <Text style={styles.moveQtyLabel}>Quantity to move:</Text>
              <View style={styles.qtyBadge}>
                <Text style={styles.qtyBadgeText}>
                  {Number(move.quantity)} {move.uom?.code ?? move.uom?.name ?? 'Units'}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Action Controls */}
        <View style={styles.actions}>
          {picking.state === 'draft' && (
            <Button
              title="Confirm Transfer"
              onPress={handleConfirm}
              loading={busy}
              size="lg"
            />
          )}
          {picking.state === 'confirmed' && (
            <Button
              title="Validate & Complete Transfer"
              onPress={handleValidate}
              loading={busy}
              variant="secondary"
              size="lg"
            />
          )}
          {(picking.state === 'draft' || picking.state === 'confirmed') && (
            <Button
              title="Cancel Transfer"
              onPress={handleCancel}
              loading={busy}
              variant="ghost"
              style={styles.actionBtnGap}
            />
          )}
          {picking.state === 'done' && (
            <Button
              title="Create Return Transfer"
              onPress={handleReturn}
              loading={busy}
              variant="ghost"
              style={styles.actionBtnGap}
            />
          )}
        </View>
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
    marginBottom: spacing.md,
  },
  name: {
    ...typography.h2,
    color: colors.text,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm + 4,
  },
  locationBox: {
    flex: 1,
  },
  locationLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 2,
    fontSize: 11,
  },
  locationName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  routeArrow: {
    color: colors.primary,
    fontSize: 16,
    marginHorizontal: spacing.sm,
  },
  metaList: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  metaValue: {
    ...typography.captionBold,
    color: colors.text,
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
  moveCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  moveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  moveProduct: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  moveQtyWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moveQtyLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  qtyBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  qtyBadgeText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  actions: {
    marginTop: spacing.md,
  },
  actionBtnGap: {
    marginTop: spacing.sm,
  },
});

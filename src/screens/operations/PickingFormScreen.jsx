import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { ErrorBanner } from '../../components/Feedback';
import { stockPickingsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme/theme';

const TYPE_TITLES = {
  receipt: 'New Stock Receipt',
  delivery: 'New Delivery',
  internal: 'New Internal Transfer',
};

const TYPE_ICONS = {
  receipt: '📥',
  delivery: '📤',
  internal: '🔄',
};

const PARTNER_RELATION = {
  receipt: 'vendors',
  delivery: 'customers',
};

const MOVES_FIELD = {
  name: 'moves',
  label: 'Products',
  type: 'array',
  itemLabel: 'Product Line',
  itemFields: [
    { name: 'productId', label: 'Product', type: 'relation', relation: 'products', required: true },
    { name: 'quantity', label: 'Quantity', type: 'number', default: 1 },
    { name: 'uomId', label: 'UoM (defaults to product UoM)', type: 'relation', relation: 'uoms' },
  ],
};

export default function PickingFormScreen({ route, navigation }) {
  const { pickingType } = route.params;
  const partnerRelation = PARTNER_RELATION[pickingType];

  useLayoutEffect(() => {
    navigation.setOptions({ title: TYPE_TITLES[pickingType] ?? 'New Transfer' });
  }, [navigation, pickingType]);

  const [operationType, setOperationType] = useState(null);
  const [warehouse, setWarehouse] = useState(null);
  const [sourceLocation, setSourceLocation] = useState(null);
  const [destLocation, setDestLocation] = useState(null);
  const [partner, setPartner] = useState(null);
  const [scheduledDate, setScheduledDate] = useState('');
  const [origin, setOrigin] = useState('');
  const [moves, setMoves] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleOperationTypeChange = opType => {
    setOperationType(opType);
    if (opType) {
      if (opType.warehouse) setWarehouse(opType.warehouse);
      if (opType.defaultSourceLocation) setSourceLocation(opType.defaultSourceLocation);
      if (opType.defaultDestLocation) setDestLocation(opType.defaultDestLocation);
    }
  };

  const handleSave = async () => {
    if (!sourceLocation?.id || !destLocation?.id) {
      Alert.alert('Missing Information', 'Please select both a source and destination location.');
      return;
    }
    if (!moves.length || moves.some(m => !m.productId?.id || !m.quantity)) {
      Alert.alert('Missing Information', 'Add at least one product line with a valid quantity.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        pickingType,
        operationTypeId: operationType?.id,
        warehouseId: warehouse?.id,
        sourceLocationId: sourceLocation.id,
        destLocationId: destLocation.id,
        partnerId: partner?.id,
        scheduledDate: scheduledDate || undefined,
        origin: origin || undefined,
        moves: moves.map(m => ({
          productId: m.productId.id,
          quantity: Number(m.quantity),
          uomId: m.uomId?.id,
        })),
      };
      const created = await stockPickingsApi.create(payload);
      navigation.replace('PickingDetail', { id: created.id });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <View style={styles.bannerIconBox}>
            <Text style={styles.bannerIcon}>{TYPE_ICONS[pickingType] ?? '📦'}</Text>
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>{TYPE_TITLES[pickingType] ?? 'Transfer'}</Text>
            <Text style={styles.bannerSubtitle}>Configure source, destination and products</Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        <View style={styles.formCard}>
          <FormField
            field={{
              name: 'operationType',
              label: 'Operation Type (auto-fills locations)',
              type: 'relation',
              relation: 'operation-types',
              params: { pickingType },
            }}
            value={operationType}
            onChange={handleOperationTypeChange}
          />
          <FormField
            field={{ name: 'warehouse', label: 'Warehouse (optional)', type: 'relation', relation: 'warehouses' }}
            value={warehouse}
            onChange={setWarehouse}
          />
          <FormField
            field={{ name: 'sourceLocation', label: 'Source Location', type: 'relation', relation: 'locations', required: true }}
            value={sourceLocation}
            onChange={setSourceLocation}
          />
          <FormField
            field={{ name: 'destLocation', label: 'Destination Location', type: 'relation', relation: 'locations', required: true }}
            value={destLocation}
            onChange={setDestLocation}
          />
          {partnerRelation ? (
            <FormField
              field={{
                name: 'partner',
                label: pickingType === 'receipt' ? 'Vendor (optional)' : 'Customer (optional)',
                type: 'relation',
                relation: partnerRelation,
              }}
              value={partner}
              onChange={setPartner}
            />
          ) : null}
          <FormField
            field={{ name: 'scheduledDate', label: 'Scheduled Date (optional)', type: 'date' }}
            value={scheduledDate}
            onChange={setScheduledDate}
          />
          <FormField
            field={{ name: 'origin', label: 'Reference / Source Doc (optional)', type: 'text', placeholder: 'e.g. PO-1001, SO-2045' }}
            value={origin}
            onChange={setOrigin}
          />
        </View>

        <FormField field={MOVES_FIELD} value={moves} onChange={setMoves} />

        <View style={styles.buttonGroup}>
          <Button
            title="Create Transfer"
            onPress={handleSave}
            loading={saving}
            size="lg"
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.cancelBtn}
          />
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  bannerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  buttonGroup: {
    marginTop: spacing.sm,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});

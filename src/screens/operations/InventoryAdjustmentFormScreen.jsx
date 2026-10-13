import React, { useState } from 'react';
import { ScrollView, Alert, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { ErrorBanner } from '../../components/Feedback';
import { inventoryAdjustmentsApi } from '../../api/stock';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme/theme';

const LINES_FIELD = {
  name: 'lines',
  label: 'Count Lines',
  type: 'array',
  itemLabel: 'Line',
  itemFields: [
    { name: 'productId', label: 'Product', type: 'relation', relation: 'products', required: true },
    { name: 'warehouseId', label: 'Warehouse', type: 'relation', relation: 'warehouses', required: true },
    { name: 'countedQuantity', label: 'Initial Count (optional)', type: 'number' },
  ],
};

export default function InventoryAdjustmentFormScreen({ navigation }) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!lines.length || lines.some(l => !l.productId?.id || !l.warehouseId?.id)) {
      Alert.alert('Missing Information', 'Please add at least one line with both a product and warehouse.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim() || undefined,
        notes: notes.trim() || undefined,
        warehouseId: lines[0].warehouseId.id,
        lines: lines.map(l => ({
          productId: l.productId.id,
          warehouseId: l.warehouseId.id,
          countedQuantity:
            l.countedQuantity === '' || l.countedQuantity === null || l.countedQuantity === undefined
              ? undefined
              : Number(l.countedQuantity),
        })),
      };
      const created = await inventoryAdjustmentsApi.create(payload);
      navigation.replace('InventoryAdjustmentDetail', { id: created.id });
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
            <Text style={styles.bannerIcon}>🧮</Text>
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>New Stock Adjustment</Text>
            <Text style={styles.bannerSubtitle}>
              Reconcile physical inventory counts with system records
            </Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        <View style={styles.formCard}>
          <FormField
            field={{
              name: 'name',
              label: 'Adjustment Name (optional)',
              type: 'text',
              placeholder: 'e.g. Month-End Count - Warehouse A',
            }}
            value={name}
            onChange={setName}
          />
          <FormField
            field={{
              name: 'notes',
              label: 'Internal Notes (optional)',
              type: 'textarea',
              placeholder: 'Reason for recount, batch notes, auditor comments...',
            }}
            value={notes}
            onChange={setNotes}
          />
        </View>

        <FormField field={LINES_FIELD} value={lines} onChange={setLines} />

        <View style={styles.buttonGroup}>
          <Button
            title="Create Stock Adjustment"
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
    backgroundColor: colors.amberSoft,
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

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Alert,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { ErrorBanner } from '../../components/Feedback';
import { inventoryAdjustmentsApi } from '../../api/stock';
import { createCrudApi } from '../../api/crud';
import { getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, typography } from '../../theme/theme';

const INVENTORY_TYPE_OPTIONS = [
  { value: 'stock_inventory', label: 'Stock Inventory' },
  { value: 'stock_journal', label: 'Stock Journal' },
];

const INVENTORY_OF_OPTIONS = [
  { value: 'all_products', label: 'All products' },
  { value: 'category', label: 'One product category' },
  { value: 'product', label: 'One product only' },
  { value: 'lot', label: 'One lot/serial number' },
];

export default function InventoryAdjustmentFormScreen({ navigation }) {
  const { user } = useAuth();
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [reference, setReference] = useState('');
  const [warehouse, setWarehouse] = useState(null);
  const [location, setLocation] = useState(null);
  const [inventoryType, setInventoryType] = useState('stock_inventory');
  const [inventoryOf, setInventoryOf] = useState('all_products');
  const [category, setCategory] = useState(null);
  const [product, setProduct] = useState(null);
  const [lotNumber, setLotNumber] = useState('');
  const [inventoryDate, setInventoryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Auto-generate reference & select default warehouse & internal location
  useEffect(() => {
    let isMounted = true;
    async function loadDefaults() {
      try {
        setLoadingDefaults(true);
        // Default today's date YYYY-MM-DD
        const today = new Date().toISOString().slice(0, 10);
        setInventoryDate(today);

        // Reference default: INV/YYYY/XXXX
        const year = today.slice(0, 4);
        const randomNum = Math.floor(100 + Math.random() * 900);
        setReference(`INV/${year}/${randomNum}`);

        // Fetch warehouses for this company
        const whRes = await createCrudApi('/warehouses').list({
          page: 1,
          limit: 50,
          companyId: user?.companyId,
        });
        const whList = whRes.data || [];
        if (whList.length > 0 && isMounted) {
          const defaultWh = whList[0];
          setWarehouse({
            id: defaultWh.id,
            label: defaultWh.name || defaultWh.code || 'Default Warehouse',
          });

          // Fetch internal locations for this warehouse
          const locRes = await createCrudApi('/locations').list({
            page: 1,
            limit: 50,
            warehouseId: defaultWh.id,
            companyId: user?.companyId,
          });
          const locList = locRes.data || [];
          const internalLoc =
            locList.find(l => l.usage === 'internal') || locList[0];
          if (internalLoc && isMounted) {
            setLocation({
              id: internalLoc.id,
              label: internalLoc.completeName || internalLoc.name || 'Internal Stock',
            });
          }
        }
      } catch (e) {
        // Non-blocking: user can still choose manually
      } finally {
        if (isMounted) setLoadingDefaults(false);
      }
    }
    loadDefaults();
    return () => {
      isMounted = false;
    };
  }, [user?.companyId]);

  // When warehouse changes, update location filter / default
  const handleWarehouseChange = async newWh => {
    setWarehouse(newWh);
    if (!newWh?.id) {
      setLocation(null);
      return;
    }
    try {
      const locRes = await createCrudApi('/locations').list({
        page: 1,
        limit: 50,
        warehouseId: newWh.id,
      });
      const locList = locRes.data || [];
      const internalLoc = locList.find(l => l.usage === 'internal') || locList[0];
      if (internalLoc) {
        setLocation({
          id: internalLoc.id,
          label: internalLoc.completeName || internalLoc.name,
        });
      } else {
        setLocation(null);
      }
    } catch (_) {
      setLocation(null);
    }
  };

  const buildPayload = startImmediately => {
    if (!warehouse?.id) {
      Alert.alert('Required Field', 'Please select a Warehouse.');
      return null;
    }
    if (!location?.id) {
      Alert.alert('Required Field', 'Please select an Inventoried Location.');
      return null;
    }
    if (inventoryOf === 'category' && !category?.id) {
      Alert.alert('Required Field', 'Please select a Product Category.');
      return null;
    }
    if (inventoryOf === 'product' && !product?.id) {
      Alert.alert('Required Field', 'Please select a Product.');
      return null;
    }

    return {
      reference: reference.trim() || undefined,
      name: reference.trim() || undefined,
      warehouseId: warehouse.id,
      locationId: location.id,
      companyId: user?.companyId,
      inventoryType,
      inventoryOf,
      categoryId: inventoryOf === 'category' ? category.id : undefined,
      productId: inventoryOf === 'product' ? product.id : undefined,
      lotNumber: inventoryOf === 'lot' ? lotNumber.trim() || undefined : undefined,
      inventoryDate: inventoryDate || new Date().toISOString().slice(0, 10),
      notes: notes.trim() || undefined,
      startImmediately,
    };
  };

  const handleStartInventory = async () => {
    const payload = buildPayload(true);
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
      const created = await inventoryAdjustmentsApi.create(payload);
      navigation.replace('InventoryAdjustmentDetail', { id: created.id });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const payload = buildPayload(false);
    if (!payload) return;
    setSaving(true);
    setError(null);
    try {
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
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIconBox}>
            <Text style={styles.bannerIcon}>🧮</Text>
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>New Inventory Adjustment</Text>
            <Text style={styles.bannerSubtitle}>
              Physical count verification & stock level reconciliation
            </Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        {loadingDefaults ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading warehouse & stock locations...</Text>
          </View>
        ) : null}

        {/* Primary Settings Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Adjustment Setup</Text>

          {/* Inventory Reference */}
          <FormField
            field={{
              name: 'reference',
              label: 'Inventory Reference',
              type: 'text',
              placeholder: 'e.g. INV/2026/001',
              required: true,
            }}
            value={reference}
            onChange={setReference}
          />

          {/* Warehouse (Auto-selected, editable) */}
          <FormField
            field={{
              name: 'warehouse',
              label: 'Warehouse',
              type: 'relation',
              relation: 'warehouses',
              params: user?.companyId ? { companyId: user.companyId } : undefined,
              required: true,
            }}
            value={warehouse}
            onChange={handleWarehouseChange}
          />

          {/* Inventoried Location */}
          <FormField
            field={{
              name: 'location',
              label: 'Inventoried Location',
              type: 'relation',
              relation: 'locations',
              params: {
                ...(warehouse?.id ? { warehouseId: warehouse.id } : {}),
                ...(user?.companyId ? { companyId: user.companyId } : {}),
              },
              required: true,
            }}
            value={location}
            onChange={setLocation}
          />

          {/* Inventory Date */}
          <FormField
            field={{
              name: 'inventoryDate',
              label: 'Inventory Date',
              type: 'date',
              required: true,
            }}
            value={inventoryDate}
            onChange={setInventoryDate}
          />
        </View>

        {/* Scope and Type Card */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Type & Scope</Text>

          {/* Inventory Type */}
          <FormField
            field={{
              name: 'inventoryType',
              label: 'Inventory Type',
              type: 'select',
              options: INVENTORY_TYPE_OPTIONS,
              required: true,
            }}
            value={inventoryType}
            onChange={setInventoryType}
          />

          {/* Inventory of */}
          <FormField
            field={{
              name: 'inventoryOf',
              label: 'Inventory of',
              type: 'select',
              options: INVENTORY_OF_OPTIONS,
              required: true,
            }}
            value={inventoryOf}
            onChange={val => {
              setInventoryOf(val);
              if (val !== 'category') setCategory(null);
              if (val !== 'product') setProduct(null);
              if (val !== 'lot') setLotNumber('');
            }}
          />

          {/* Conditionally: One product category */}
          {inventoryOf === 'category' ? (
            <FormField
              field={{
                name: 'category',
                label: 'Product Category',
                type: 'relation',
                relation: 'product-categories',
                params: user?.companyId ? { companyId: user.companyId } : undefined,
                required: true,
              }}
              value={category}
              onChange={setCategory}
            />
          ) : null}

          {/* Conditionally: One product only */}
          {inventoryOf === 'product' ? (
            <FormField
              field={{
                name: 'product',
                label: 'Product',
                type: 'relation',
                relation: 'products',
                params: user?.companyId ? { companyId: user.companyId } : undefined,
                required: true,
              }}
              value={product}
              onChange={setProduct}
            />
          ) : null}

          {/* Conditionally: One lot/serial number */}
          {inventoryOf === 'lot' ? (
            <FormField
              field={{
                name: 'lotNumber',
                label: 'Lot / Serial Number',
                type: 'text',
                placeholder: 'e.g. LOT-2026-A1',
                required: true,
              }}
              value={lotNumber}
              onChange={setLotNumber}
            />
          ) : null}
        </View>

        {/* Internal Notes */}
        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Internal Notes</Text>
          <FormField
            field={{
              name: 'notes',
              label: 'Notes (optional)',
              type: 'textarea',
              placeholder: 'Reason for recount, batch details, auditor comments...',
            }}
            value={notes}
            onChange={setNotes}
          />
        </View>

        {/* Actions */}
        <View style={styles.buttonGroup}>
          <Button
            title="Start Inventory"
            onPress={handleStartInventory}
            loading={saving}
            size="lg"
            style={styles.primaryBtn}
          />
          <Button
            title="Save as Draft"
            variant="outline"
            onPress={handleSaveDraft}
            disabled={saving}
            style={styles.draftBtn}
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
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonGroup: {
    marginTop: spacing.sm,
  },
  primaryBtn: {
    marginBottom: spacing.sm,
  },
  draftBtn: {
    marginBottom: spacing.sm,
  },
  cancelBtn: {
    marginTop: 2,
  },
});

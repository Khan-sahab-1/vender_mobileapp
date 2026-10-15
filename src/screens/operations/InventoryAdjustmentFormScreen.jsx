import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Alert,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import PickerModal from '../../components/PickerModal';
import { ErrorBanner } from '../../components/Feedback';
import { inventoryAdjustmentsApi, stockQuantsApi } from '../../api/stock';
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
  const [lines, setLines] = useState([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [addingLine, setAddingLine] = useState(false);

  // Auto-generate reference & select default warehouse & internal location
  useEffect(() => {
    let isMounted = true;
    async function loadDefaults() {
      try {
        setLoadingDefaults(true);
        // Default today's date YYYY-MM-DD
        const today = new Date().toISOString().slice(0, 10);
        setInventoryDate(today);

        // Reference default: YYYY/XXXX
        const year = today.slice(0, 4);
        const randomNum = Math.floor(100 + Math.random() * 900);
        setReference(`${year}/${randomNum}`);

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

  const handleOpenAddLine = () => {
    if (!location?.id) {
      Alert.alert(
        'Inventoried Location Required',
        'Please select a Warehouse and Inventoried Location first before adding product lines.',
      );
      return;
    }
    setShowProductPicker(true);
  };

  const handleProductSelected = async item => {
    setShowProductPicker(false);
    if (!item?.value) return;

    if (lines.some(l => l.productId === item.value)) {
      Alert.alert(
        'Product Already Added',
        'This product is already present in your inventory lines list.',
      );
      return;
    }

    setAddingLine(true);
    try {
      const locId = location?.id;
      let theoreticalQty = 0;
      try {
        const onHandRes = await stockQuantsApi.onHand(item.value, locId);
        theoreticalQty = Number(onHandRes?.quantity ?? 0);
      } catch (_) {
        theoreticalQty = 0;
      }

      const prodRecord = item.record || {};
      const newLine = {
        id: 'temp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        productId: item.value,
        productName: prodRecord.name || item.label || 'Product',
        sku: prodRecord.sku || '',
        tracking: prodRecord.tracking || 'none',
        lotNumber: prodRecord.lotNumber || lotNumber || '',
        locationId: locId,
        locationName: location?.label || 'Internal Location',
        theoreticalQuantity: theoreticalQty,
        countedQuantity: theoreticalQty,
      };

      setLines(prev => [...prev, newLine]);
    } catch (e) {
      Alert.alert('Error Adding Line', getErrorMessage(e));
    } finally {
      setAddingLine(false);
    }
  };

  const handleRemoveLine = index => {
    setLines(prev => prev.filter((_, i) => i !== index));
  };

  const handleCountChange = (index, value) => {
    setLines(prev =>
      prev.map((l, i) => (i === index ? { ...l, countedQuantity: value } : l)),
    );
  };

  const handleAdjustCount = (index, delta) => {
    setLines(prev =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const current = Number(l.countedQuantity || 0);
        const updated = Math.max(0, current + delta);
        return { ...l, countedQuantity: updated };
      }),
    );
  };

  const handleLotNumberChange = (index, text) => {
    setLines(prev =>
      prev.map((l, i) => (i === index ? { ...l, lotNumber: text } : l)),
    );
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

    const payload = {
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

    if (lines.length > 0) {
      payload.lines = lines.map(l => ({
        productId: l.productId,
        locationId: l.locationId || location.id,
        lotNumber: l.lotNumber?.trim() || undefined,
        countedQuantity: Number(l.countedQuantity || 0),
      }));
    }

    return payload;
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
              placeholder: 'e.g. 2026/001',
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

        {/* Odoo-style Inventory Lines & Real Quantity Section */}
        <View style={styles.formCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeader}>Inventory Lines (Real Quantity)</Text>
              <Text style={styles.cardHeaderSub}>
                Odoo-style physical count verification
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addLineBtn}
              onPress={handleOpenAddLine}
              disabled={addingLine}>
              <Text style={styles.addLineBtnText}>+ Add a line</Text>
            </TouchableOpacity>
          </View>

          {addingLine && (
            <View style={styles.addingLineBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.addingLineText}>Fetching theoretical stock...</Text>
            </View>
          )}

          {lines.length === 0 ? (
            <View style={styles.emptyLinesHint}>
              <Text style={styles.emptyLinesHintIcon}>📋</Text>
              <Text style={styles.emptyLinesHintTitle}>No Product Lines Added Yet</Text>
              <Text style={styles.emptyLinesHintDesc}>
                Tap &quot;+ Add a line&quot; to pick a product and immediately fetch theoretical stock, or click &quot;Start Inventory&quot; below to auto-populate all products in scope.
              </Text>
            </View>
          ) : (
            lines.map((line, index) => {
              const theoretical = Number(line.theoreticalQuantity || 0);
              const counted = Number(line.countedQuantity || 0);
              const diff = counted - theoretical;

              return (
                <View key={line.id} style={styles.lineItemCard}>
                  {/* Line Header */}
                  <View style={styles.lineHeaderRow}>
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={styles.lineProductName}>{line.productName}</Text>
                      <View style={styles.lineMetaRow}>
                        {line.sku ? (
                          <Text style={styles.lineSkuText}>SKU: {line.sku}</Text>
                        ) : null}
                        {line.tracking && line.tracking !== 'none' ? (
                          <View style={styles.trackingBadge}>
                            <Text style={styles.trackingBadgeText}>
                              Tracking: {line.tracking}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* Variance badge */}
                    <View
                      style={[
                        styles.diffBadge,
                        diff > 0 && styles.diffSurplus,
                        diff < 0 && styles.diffLoss,
                        diff === 0 && styles.diffZero,
                      ]}>
                      <Text
                        style={[
                          styles.diffText,
                          diff > 0 && styles.diffSurplusText,
                          diff < 0 && styles.diffLossText,
                          diff === 0 && styles.diffZeroText,
                        ]}>
                        Diff: {diff > 0 ? `+${diff}` : diff}
                      </Text>
                    </View>

                    {/* Delete Line */}
                    <TouchableOpacity
                      style={styles.deleteLineBtn}
                      onPress={() => handleRemoveLine(index)}>
                      <Text style={styles.deleteLineBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Lot / Serial input */}
                  <View style={styles.lotRow}>
                    <Text style={styles.lotLabel}>Lot / Serial No:</Text>
                    <TextInput
                      style={styles.lotInput}
                      value={line.lotNumber}
                      onChangeText={text => handleLotNumberChange(index, text)}
                      placeholder="Optional Lot / Serial #"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>

                  {/* Counts Row: Theoretical Qty -> Real Quantity */}
                  <View style={styles.countsRow}>
                    <View style={styles.countBlock}>
                      <Text style={styles.countBlockLabel}>Theoretical Qty</Text>
                      <Text style={styles.theoreticalVal}>{theoretical}</Text>
                    </View>

                    <Text style={styles.countArrow}>➔</Text>

                    <View style={styles.countBlock}>
                      <Text style={styles.countBlockLabel}>Real Quantity</Text>
                      <Text style={styles.countBlockSub}>(Counted)</Text>
                      <View style={styles.qtyControlWrap}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleAdjustCount(index, -1)}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <TextInput
                          style={styles.qtyInput}
                          keyboardType="numeric"
                          value={String(line.countedQuantity ?? '')}
                          onChangeText={text =>
                            handleCountChange(index, text.replace(/[^0-9.-]/g, ''))
                          }
                        />
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleAdjustCount(index, 1)}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
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

      {/* Product picker modal for Add a Line */}
      <PickerModal
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        onSelect={handleProductSelected}
        title="Select Product to Add"
        relation="products"
        params={{
          companyId: user?.companyId,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -2,
  },
  addLineBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  addLineBtnText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 12,
  },
  addingLineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
    marginBottom: spacing.sm,
    justifyContent: 'center',
  },
  addingLineText: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  emptyLinesHint: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  emptyLinesHintIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  emptyLinesHintTitle: {
    ...typography.label,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  emptyLinesHintDesc: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  lineItemCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  lineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  lineProductName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  lineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  lineSkuText: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: spacing.sm,
  },
  trackingBadge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.xs,
  },
  trackingBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  diffBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginRight: spacing.xs,
  },
  diffSurplus: {
    backgroundColor: '#E7F9F2',
  },
  diffSurplusText: {
    color: '#057A60',
    fontWeight: '700',
    fontSize: 11,
  },
  diffLoss: {
    backgroundColor: '#FFEAEA',
  },
  diffLossText: {
    color: '#B42323',
    fontWeight: '700',
    fontSize: 11,
  },
  diffZero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  diffZeroText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 11,
  },
  diffText: {
    ...typography.caption,
  },
  deleteLineBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteLineBtnText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '700',
  },
  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: 2,
  },
  lotLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginRight: spacing.xs,
  },
  lotInput: {
    flex: 1,
    height: 28,
    backgroundColor: colors.surface,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
    fontSize: 11,
    color: colors.text,
  },
  countsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countBlock: {
    flex: 1,
    alignItems: 'center',
  },
  countBlockLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  countBlockSub: {
    fontSize: 9,
    color: colors.textMuted,
    marginBottom: 2,
  },
  theoreticalVal: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  countArrow: {
    fontSize: 14,
    color: colors.textMuted,
    marginHorizontal: spacing.xs,
  },
  qtyControlWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: radius.xs,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text,
  },
  qtyInput: {
    width: 48,
    height: 26,
    backgroundColor: colors.surface,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    textAlign: 'center',
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: 3,
    padding: 0,
    fontSize: 13,
  },
});

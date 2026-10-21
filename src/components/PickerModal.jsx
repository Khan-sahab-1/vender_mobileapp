import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createCrudApi } from '../api/crud';
import { getEntity } from '../config/entities';
import { colors, radius, spacing, typography } from '../theme/theme';
import SearchBar from './SearchBar';
import { LoadingOverlay, EmptyState } from './Feedback';
import ProductStockModal from './ProductStockModal';

/**
 * Modal list picker.
 * - Static mode: pass `options` ([{value,label}]) directly (used for `select` fields).
 * - Relation mode: pass `relation` (entity key) and it fetches/searches that
 *   entity's list endpoint live, showing its primaryField as the label.
 */
export default function PickerModal({
  visible,
  onClose,
  onSelect,
  selectedValue,
  title = 'Select',
  options,
  relation,
  params,
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState(options ?? []);
  const [loading, setLoading] = useState(false);
  const [stockInspectProduct, setStockInspectProduct] = useState(null);

  const entity = relation ? getEntity(relation) : null;

  const loadRelation = useCallback(async () => {
    if (!entity) return;
    setLoading(true);
    try {
      const api = createCrudApi(entity.endpoint);
      const queryParams = {
        page: 1,
        limit: 100,
        search: search || undefined,
        ...(entity.defaultParams || {}),
        ...(params || {}),
      };
      const res = await api.list(queryParams);
      let records = res.data ?? [];
      // If filtered query yields 0 items and searching for companyType, fallback to /partners with companyType
      if (records.length === 0 && params?.companyType) {
        try {
          const partnerApi = createCrudApi('/partners');
          const fallbackRes = await partnerApi.list({
            page: 1,
            limit: 100,
            search: search || undefined,
            companyType: params.companyType,
          });
          records = fallbackRes.data ?? [];
        } catch (_) {}
      } else if (records.length === 0 && params && Object.keys(params).length > 0 && !params?.strict) {
        const fallback = await api.list({
          page: 1,
          limit: 100,
          search: search || undefined,
          ...(entity.defaultParams || {}),
        });
        records = fallback.data ?? [];
      }
      if (params?.excludeId) {
        records = records.filter(r => r.id !== params.excludeId);
      }
      setItems(
        records.map(record => {
          const secondary = entity.secondaryField;
          const baseName =
            record.completeName ||
            record[entity.primaryField] ||
            (secondary ? record[secondary] : null) ||
            record.name ||
            record.id;
          const prefix = record.code || record.codePrefix;
          const label = prefix && prefix !== baseName ? `[${prefix}] ${baseName}` : baseName;
          return {
            value: record.id,
            label,
            record,
          };
        }),
      );
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [entity, search, params]);

  useEffect(() => {
    if (!visible) return;
    if (relation) {
      loadRelation();
    } else {
      setItems(options ?? []);
    }
  }, [visible, search, relation, loadRelation, options]);

  const filteredStatic =
    !relation && search
      ? (options ?? []).filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
      : items;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              onSelect({ value: null, label: null, record: null });
              onClose();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearHeaderBtnWrap}
            accessibilityRole="button"
            accessibilityLabel="Clear selection">
            <Text style={styles.clearHeaderBtn}>Clear</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.closeBtnWrap}
            accessibilityRole="button"
            accessibilityLabel="Close picker">
            <Text style={styles.closeBtn}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${title.toLowerCase()}...`}
        />

        {loading ? (
          <LoadingOverlay full />
        ) : (
          <FlatList
            data={relation ? items : filteredStatic}
            keyExtractor={item => String(item.value)}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <EmptyState
                icon="🔍"
                title="No results found"
                subtitle="Try adjusting your search terms."
              />
            }
            renderItem={({ item }) => {
              const isSelected = selectedValue === item.value;
              const isProduct = relation === 'products' || relation === 'product';
              const onHand = item.record?.onHandQuantity;
              return (
                <TouchableOpacity
                  style={[styles.row, isSelected && styles.rowSelected]}
                  activeOpacity={0.6}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}>
                  <View style={styles.rowContent}>
                    <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                      {item.label}
                    </Text>
                    {item.record?.sku ? (
                      <Text style={styles.rowSubLabel}>SKU: {item.record.sku}</Text>
                    ) : null}
                  </View>

                  {isProduct && onHand !== undefined ? (
                    <TouchableOpacity
                      style={styles.pickerOnHandBadge}
                      onPress={() => setStockInspectProduct(item.record)}
                      activeOpacity={0.7}>
                      <Text style={styles.pickerOnHandText}>{Number(onHand)} on hand</Text>
                    </TouchableOpacity>
                  ) : null}

                  {isSelected ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : (
                    <Text style={styles.rowChevron}>›</Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Stock on Hand Location Breakdown Modal */}
        <ProductStockModal
          visible={!!stockInspectProduct}
          productId={stockInspectProduct?.id}
          product={stockInspectProduct}
          onClose={() => setStockInspectProduct(null)}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  clearHeaderBtnWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  clearHeaderBtn: {
    color: colors.textMuted,
    ...typography.captionBold,
    fontSize: 13,
  },
  closeBtnWrap: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  closeBtn: {
    color: colors.primary,
    ...typography.captionBold,
    fontSize: 13,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowSelected: {
    backgroundColor: colors.primaryLight,
  },
  rowLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  rowLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkmark: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  rowChevron: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '300',
  },
  rowSubLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  pickerOnHandBadge: {
    backgroundColor: '#E7F9F2',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  pickerOnHandText: {
    color: '#057A60',
    fontWeight: '700',
    fontSize: 11,
  },
});

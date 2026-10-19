import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ScreenContainer from '../../components/ScreenContainer';
import StateBadge from '../../components/StateBadge';
import { vendorBillsApi } from '../../api/purchase';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

const TABS = [
  { key: 'all', label: 'All Bills' },
  { key: 'draft', label: 'Draft' },
  { key: 'open', label: 'Open' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function Venderbills() {
  const navigation = useNavigation();

  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBills = useCallback(async () => {
    try {
      const res = await vendorBillsApi.list({ limit: 100 });
      const items = res?.data || res?.items || (Array.isArray(res) ? res : []);
      setBills(items);
    } catch {
      // Fallback empty
      setBills([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBills();
  }, [fetchBills]);

  // Financial KPI calculations
  const kpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalResidual = 0;
    let paidCount = 0;
    let openCount = 0;

    bills.forEach(b => {
      const total = Number(b.amountTotal || 0);
      const residual = Number(b.residualAmount ?? b.amountTotal ?? 0);
      const state = b.state?.toLowerCase();

      if (state !== 'cancelled') {
        totalInvoiced += total;
        if (state === 'open' || state === 'posted') {
          totalResidual += residual;
          openCount += 1;
        } else if (state === 'paid') {
          paidCount += 1;
        }
      }
    });

    return { totalInvoiced, totalResidual, paidCount, openCount };
  }, [bills]);

  // Filter & Search
  const filteredBills = useMemo(() => {
    return bills.filter(bill => {
      // Filter by tab
      const st = bill.state?.toLowerCase() || 'draft';
      if (activeTab === 'draft' && st !== 'draft') return false;
      if (activeTab === 'open' && st !== 'open' && st !== 'posted') return false;
      if (activeTab === 'paid' && st !== 'paid') return false;
      if (activeTab === 'cancelled' && st !== 'cancelled') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (bill.billNumber || '').toLowerCase();
        const invNum = (bill.invoiceNumber || '').toLowerCase();
        const vName = (bill.vendorName || bill.vendor?.name || '').toLowerCase();
        const deliverTo = (bill.deliverTo || '').toLowerCase();
        const divName = (bill.division?.name || '').toLowerCase();
        const poRef = (bill.sourceDocument || '').toLowerCase();
        return (
          num.includes(q) ||
          invNum.includes(q) ||
          vName.includes(q) ||
          deliverTo.includes(q) ||
          divName.includes(q) ||
          poRef.includes(q)
        );
      }

      return true;
    });
  }, [bills, activeTab, searchQuery]);

  const renderBillCard = ({ item }) => {
    const billState = item.state || 'draft';
    const total = Number(item.amountTotal || 0);
    const residual = Number(item.residualAmount ?? item.amountTotal ?? 0);
    const dateStr = item.invoiceDate
      ? String(item.invoiceDate).slice(0, 10)
      : item.createdAt
      ? String(item.createdAt).slice(0, 10)
      : '';

    return (
      <TouchableOpacity
        style={[styles.card, shadows.sm]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate(navigationScreen.VENDOR_BILL_DETAIL, {
            billId: item.id,
            bill: item,
          })
        }>
        {/* Top row: Bill number, Date & State */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: spacing.xs }}>
            <Text style={styles.billNumber}>{item.billNumber || 'BILL-DRAFT'}</Text>
            {item.invoiceNumber ? (
              <Text style={styles.invNumber}>Inv #: {item.invoiceNumber}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
              {item.receiptDate ? (
                <Text style={styles.billDate}>Receipt: {String(item.receiptDate).slice(0, 10)}</Text>
              ) : null}
              {dateStr ? (
                <Text style={styles.billDate}>{item.receiptDate ? ' · ' : ''}Bill: {dateStr}</Text>
              ) : null}
            </View>
          </View>
          <StateBadge state={billState} />
        </View>

        {/* Vendor info */}
        <View style={styles.vendorRow}>
          <Text style={styles.vendorLabel}>Vendor:</Text>
          <Text style={styles.vendorName} numberOfLines={1}>
            {item.vendorName || item.vendor?.name || 'Unknown Vendor'}
          </Text>
        </View>

        {/* Deliver To */}
        {(Boolean(item.deliverTo) || Boolean(item.warehouse?.name)) && (
          <View style={styles.vendorRow}>
            <Text style={styles.vendorLabel}>Deliver To:</Text>
            <Text style={[styles.vendorName, { color: '#059669' }]} numberOfLines={1}>
              📦 {item.deliverTo || (item.warehouse?.name ? `${item.warehouse.name}: Receipts` : '')}
            </Text>
          </View>
        )}

        {/* Extra info: Division & Source PO */}
        <View style={styles.metaRow}>
          {item.sourceDocument ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>PO: {item.sourceDocument}</Text>
            </View>
          ) : null}
          {item.division?.name ? (
            <View style={[styles.tag, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.tagText, { color: '#1D4ED8' }]}>🏭 {item.division.name}</Text>
            </View>
          ) : null}
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Financial Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total Invoiced</Text>
            <Text style={styles.amountTotal}>
              {item.currency || 'INR'} {total.toFixed(2)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amountLabel}>Residual Due</Text>
            <Text
              style={[
                styles.amountResidual,
                residual > 0 ? styles.amountResidualDue : styles.amountResidualZero,
              ]}>
              {item.currency || 'INR'} {residual.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* View Details Action Link */}
        <View style={styles.actionRow}>
          <Text style={styles.actionText}>View Bill & Double-Entry Ledger →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer>
      {/* Search Header */}
      <View style={styles.topHeader}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Bill #, Vendor, or PO..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* KPI Summary Cards */}
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, styles.kpiCardBlue]}>
            <Text style={styles.kpiTitle}>TOTAL INVOICED</Text>
            <Text style={styles.kpiValue}>₹{kpis.totalInvoiced.toLocaleString('en-IN')}</Text>
          </View>

          <View style={[styles.kpiCard, styles.kpiCardOrange]}>
            <Text style={styles.kpiTitle}>OUTSTANDING DUE</Text>
            <Text style={[styles.kpiValue, { color: '#C2410C' }]}>
              ₹{kpis.totalResidual.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={[styles.kpiCard, styles.kpiCardGreen]}>
            <Text style={styles.kpiTitle}>PAID BILLS</Text>
            <Text style={[styles.kpiValue, { color: '#15803D' }]}>{kpis.paidCount}</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.key)}>
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bill List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Vendor Bills...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={item => String(item.id)}
          renderItem={renderBillCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>📄</Text>
              <Text style={styles.emptyTitle}>No Vendor Bills Found</Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'No bills match your search criteria.'
                  : 'Approve an Adhoc Purchase Order to automatically generate a direct Vendor Bill.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate(navigationScreen.PURCHASE_ORDER)}>
                <Text style={styles.emptyBtnText}>Go to Purchase Orders</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topHeader: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 42,
    marginBottom: spacing.sm,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  clearIcon: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: 6,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
  },
  kpiCardBlue: {
    backgroundColor: '#EFF6FF',
  },
  kpiCardOrange: {
    backgroundColor: '#FFF7ED',
  },
  kpiCardGreen: {
    backgroundColor: '#F0FDF4',
  },
  kpiTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSubtle,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabButtonTextActive: {
    color: colors.textInverted,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  billNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  invNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 1,
  },
  billDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  vendorLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginRight: 4,
  },
  vendorName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 6,
  },
  tag: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  amountTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  amountResidual: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  amountResidualDue: {
    color: colors.danger,
  },
  amountResidualZero: {
    color: colors.secondary,
  },
  actionRow: {
    marginTop: spacing.sm,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
    alignItems: 'flex-end',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.bodyBold,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 42,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySub: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  emptyBtnText: {
    color: colors.textInverted,
    ...typography.bodyBold,
  },
});
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
import { customerInvoicesApi } from '../../api/sales';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';
import { formatDate } from '../../utils/dateUtils';

const TABS = [
  { key: 'all', label: 'All Bills' },
  { key: 'draft', label: 'Draft' },
  { key: 'open', label: 'Open' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function CustomerInvoicesScreen() {
  const navigation = useNavigation();

  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await customerInvoicesApi.list({ limit: 100 });
      const items = res?.items || res?.data || (Array.isArray(res) ? res : []);
      setInvoices(items);
    } catch {
      setInvoices([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchInvoices();
    });
    return unsub;
  }, [navigation, fetchInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchInvoices();
  }, [fetchInvoices]);

  // Financial KPI calculations
  const kpis = useMemo(() => {
    let totalInvoiced = 0;
    let totalResidual = 0;
    let paidCount = 0;
    let openCount = 0;

    invoices.forEach(inv => {
      const total = Number(inv.amountTotal || 0);
      const residual = Number(inv.residualAmount ?? inv.amountTotal ?? 0);
      const state = inv.state?.toLowerCase();

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
  }, [invoices]);

  // Filter & Search
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const st = inv.state?.toLowerCase() || 'draft';
      if (activeTab === 'draft' && st !== 'draft') return false;
      if (activeTab === 'open' && st !== 'open' && st !== 'posted') return false;
      if (activeTab === 'paid' && st !== 'paid') return false;
      if (activeTab === 'cancelled' && st !== 'cancelled') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const num = (inv.invoiceNumber || (inv.state === 'draft' ? 'draft' : '')).toLowerCase();
        const cName = (inv.customerName || inv.customer?.name || '').toLowerCase();
        const deliverTo = (inv.deliveryAddress || '').toLowerCase();
        const divName = (inv.division?.name || '').toLowerCase();
        const soRef = (inv.sourceDocument || '').toLowerCase();
        return (
          num.includes(q) ||
          cName.includes(q) ||
          deliverTo.includes(q) ||
          divName.includes(q) ||
          soRef.includes(q)
        );
      }

      return true;
    });
  }, [invoices, activeTab, searchQuery]);

  const renderInvoiceCard = ({ item }) => {
    const invState = item.state || 'draft';
    const total = Number(item.amountTotal || 0);
    const residual = Number(item.residualAmount ?? item.amountTotal ?? 0);
    const dateStr = item.invoiceDate
      ? formatDate(item.invoiceDate)
      : item.createdAt
      ? formatDate(item.createdAt)
      : '';

    const displayName =
      invState === 'draft' && (!item.invoiceNumber || item.invoiceNumber.startsWith('DRAFT'))
        ? 'Draft Bill'
        : item.invoiceNumber || 'Customer Bill';

    return (
      <TouchableOpacity
        style={[styles.card, shadows.sm]}
        activeOpacity={0.8}
        onPress={() =>
          navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
            invoiceId: item.id,
            invoice: item,
            bill: item,
            billId: item.id,
          })
        }>
        {/* Top row: Bill number, Date & State */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: spacing.xs }}>
            <Text style={styles.billNumber}>{displayName}</Text>
            {item.sourceDocument ? (
              <Text style={styles.invNumber}>SO Ref: {item.sourceDocument}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 2 }}>
              {dateStr ? (
                <Text style={styles.billDate}>Bill Date: {dateStr}</Text>
              ) : null}
              {item.dueDate ? (
                <Text style={styles.billDate}> · Due: {formatDate(item.dueDate)}</Text>
              ) : null}
            </View>
          </View>
          <StateBadge state={invState} />
        </View>

        {/* Customer info */}
        <View style={styles.vendorRow}>
          <Text style={styles.vendorLabel}>Customer:</Text>
          <Text style={styles.vendorName} numberOfLines={1}>
            {item.customerName || item.customer?.name || 'Unknown Customer'}
          </Text>
        </View>

        {/* Deliver To */}
        {(Boolean(item.deliveryAddress) || Boolean(item.warehouse?.name)) && (
          <View style={styles.vendorRow}>
            <Text style={styles.vendorLabel}>Deliver To:</Text>
            <Text style={[styles.vendorName, { color: '#059669' }]} numberOfLines={1}>
              📦 {item.deliveryAddress || (item.warehouse?.name ? `${item.warehouse.name}: Outgoing` : '')}
            </Text>
          </View>
        )}

        {/* Extra info: Division & Source SO */}
        <View style={styles.metaRow}>
          {item.sourceDocument ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>SO: {item.sourceDocument}</Text>
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
            placeholder="Search by Bill #, Customer, or SO..."
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

      {/* Invoice List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Customer Bills...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInvoices}
          keyExtractor={item => String(item.id)}
          renderItem={renderInvoiceCard}
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
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No Customer Bills Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No bills match your search criteria.'
                  : 'Customer bills are automatically created when a Sales Order is approved.'}
              </Text>
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
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    height: 42,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 16,
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
    padding: spacing.xs,
  },
  kpiContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.xs,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiCardBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  kpiCardOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFEDD5',
  },
  kpiCardGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  kpiTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  invNumber: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  billDate: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  vendorLabel: {
    ...typography.caption,
    color: colors.textMuted,
    width: 75,
  },
  vendorName: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    ...typography.tiny,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  amountLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  amountTotal: {
    ...typography.bodyBold,
    color: colors.text,
  },
  amountResidual: {
    ...typography.bodyBold,
  },
  amountResidualDue: {
    color: '#C2410C',
  },
  amountResidualZero: {
    color: '#15803D',
  },
  actionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceSubtle,
    alignItems: 'flex-end',
  },
  actionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
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
import ScreenContainer from '../../components/ScreenContainer';
import { vendorPortalApi } from '../../api/vendorPortal';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

export default function VendorBillsScreen({ navigation }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL' | 'UNPAID' | 'PAID'

  const fetchBills = useCallback(async () => {
    try {
      const res = await vendorPortalApi.getBills();
      setBills(res || []);
    } catch {
      // fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
  };

  const filteredBills = bills.filter(b => {
    const matchesSearch =
      !search ||
      String(b.billNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      String(b.reference || '').toLowerCase().includes(search.toLowerCase());

    const isPaid = b.state === 'paid' || Number(b.residualAmount || 0) === 0;
    const isUnpaid = !isPaid;

    if (selectedFilter === 'PAID') return matchesSearch && isPaid;
    if (selectedFilter === 'UNPAID') return matchesSearch && isUnpaid;
    return matchesSearch;
  });

  const totalOutstandingDue = bills.reduce(
    (acc, b) => acc + (Number(b.residualAmount) || 0),
    0,
  );

  return (
    <ScreenContainer>
      {/* Header Bar */}
      <View style={[styles.headerBar, shadows.xs]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoices & Payments</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Outstanding Summary Banner */}
      <View style={styles.bannerBox}>
        <View style={styles.bannerRow}>
          <View>
            <Text style={styles.bannerLabel}>Total Outstanding Payment Due:</Text>
            <Text style={styles.bannerVal}>
              ₹{totalOutstandingDue.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.bannerPill}>
            <Text style={styles.bannerPillText}>{bills.length} Invoices</Text>
          </View>
        </View>
      </View>

      {/* Search & Filter Row */}
      <View style={styles.filterSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Bill # or Reference..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterPillsRow}>
          {['ALL', 'UNPAID', 'PAID'].map(f => {
            const isSel = selectedFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterPill, isSel && styles.filterPillActive]}
                onPress={() => setSelectedFilter(f)}>
                <Text
                  style={[
                    styles.filterPillText,
                    isSel && styles.filterPillTextActive,
                  ]}>
                  {f === 'ALL'
                    ? `All (${bills.length})`
                    : f === 'UNPAID'
                    ? 'Due / Unpaid'
                    : 'Fully Paid'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bills List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Invoices...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📑</Text>
              <Text style={styles.emptyText}>No Invoices Found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try another search keyword' : 'No bills under this filter'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const residual = Number(item.residualAmount || 0);
            const isPaid = item.state === 'paid' || residual === 0;

            return (
              <View style={[styles.card, shadows.xs]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.billNumber}>{item.billNumber}</Text>
                    {Boolean(item.reference) && (
                      <Text style={styles.refText}>Ref: {item.reference}</Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.stateBadge,
                      isPaid
                        ? styles.stateBadgePaid
                        : styles.stateBadgeUnpaid,
                    ]}>
                    <Text
                      style={[
                        styles.stateBadgeText,
                        isPaid
                          ? styles.stateBadgeTextPaid
                          : styles.stateBadgeTextUnpaid,
                      ]}>
                      {isPaid ? 'PAID' : 'DUE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Invoice Date:</Text>
                    <Text style={styles.metaVal}>
                      {String(item.date || '').slice(0, 10)}
                    </Text>
                  </View>

                  {Boolean(item.dueDate) && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Due Date:</Text>
                      <Text style={styles.metaVal}>
                        {String(item.dueDate || '').slice(0, 10)}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.cardFooter}>
                  <View>
                    <Text style={styles.subLabel}>Total Bill Amount</Text>
                    <Text style={styles.totalVal}>
                      ₹{Number(item.amountTotal || 0).toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.subLabel}>Remaining Due</Text>
                    <Text
                      style={[
                        styles.dueVal,
                        isPaid ? styles.dueValPaid : styles.dueValUnpaid,
                      ]}>
                      ₹{residual.toLocaleString('en-IN')}
                    </Text>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodyBold,
    color: colors.textMuted,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  bannerBox: {
    backgroundColor: '#EFF6FF',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  bannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E40AF',
  },
  bannerVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1D4ED8',
    marginTop: 2,
  },
  bannerPill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  bannerPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  filterSection: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  filterPill: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  filterPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  refText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  stateBadgePaid: {
    backgroundColor: '#DCFCE7',
  },
  stateBadgeTextPaid: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  stateBadgeUnpaid: {
    backgroundColor: '#FEE2E2',
  },
  stateBadgeTextUnpaid: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  cardBody: {
    marginTop: spacing.sm,
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  subLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  dueVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  dueValPaid: {
    color: colors.secondary,
  },
  dueValUnpaid: {
    color: colors.danger,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});


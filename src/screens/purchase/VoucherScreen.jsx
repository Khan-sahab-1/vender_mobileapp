import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import ScreenContainer from '../../components/ScreenContainer';
import { accountingApi } from '../../api/purchase';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

export default function VoucherScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  console.log('VoucherScreen route params:', route.params);
  const bill = route?.params?.bill || {};
  const initialMove = route?.params?.move || null;
  const moveId = route?.params?.moveId || bill.accountMoveId || initialMove?.id;

  const [move, setMove] = useState(initialMove);
  const [loading, setLoading] = useState(!initialMove && Boolean(moveId));
 

  const fetchMove = useCallback(async () => {
    if (!moveId) return;
    setLoading(true);
    try {
      const data = await accountingApi.getMoveById(moveId);
      if (data) setMove(data);
    } catch (e) {
      console.warn('Failed to fetch move:', e);
    } finally {
      setLoading(false);
    }
  }, [moveId]);

  useEffect(() => {
    if (!move?.lines || move.lines.length === 0) {
      fetchMove();
    }
  }, [fetchMove, move]);

  const allLines = move?.lines || bill.accountMove?.lines || [];

  // Exclude the 3rd line (Vendor Ledger / Accounts Payable) as requested
  const lines = allLines.filter(ml => {
    const rawName = (ml.account?.name || '').toLowerCase();
    const type = ml.account?.type;
    const code = ml.account?.code;
    const lineName = (ml.name || '').toLowerCase();
    const isPayable =
      type === 'payable' ||
      code === '205001' ||
      rawName.includes('vendor ledger') ||
      rawName.includes('payable') ||
      lineName.includes('accounts payable') ||
      (Number(ml.credit) > 0 && Number(ml.debit) === 0);
    return !isPayable;
  });

  const totalAmount = lines.reduce(
    (s, l) => s + (Number(l.debit || 0) || Number(l.amount || 0) || 0),
    0,
  );

  // Metadata formatting
  const billDate = bill.invoiceDate
    ? String(bill.invoiceDate).slice(0, 10)
    : move?.date
    ? String(move.date).slice(0, 10)
    : '—';

  const createdDate = bill.createdAt
    ? String(bill.createdAt).slice(0, 10)
    : move?.createdAt
    ? String(move.createdAt).slice(0, 10)
    : '—';

  const divisionName = bill.division?.name || '—';
  const journalName =
    bill.journal?.name || move?.journal?.name || 'Vendor Bills (BILL)';
  const partnerName =
    bill.vendorName || bill.vendor?.name || move?.partner?.name || '—';
  const voucherNumber =
    move?.name || bill.accountMove?.name || bill.billNumber || 'VOUCHER';
  const sourceDoc = bill.sourceDocument || bill.billNumber || move?.ref || '—';

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Top Voucher Info Card */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardHeaderTitle}>ACCOUNTING VOUCHER</Text>
              <Text style={styles.voucherNum}>{voucherNumber}</Text>
            </View>
            <View style={styles.badgeRow}>
              <View style={styles.postedBadge}>
                <Text style={styles.postedBadgeText}>Posted</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Details Grid: Bill Date, Created On, Division, Journal */}
          <View style={styles.metaGrid}>
            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Bill Date</Text>
                <Text style={styles.metaVal}>📅 {billDate}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Created On</Text>
                <Text style={styles.metaVal}>🕒 {createdDate}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Division</Text>
                <Text style={styles.metaVal}>🏭 {divisionName}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Journal</Text>
                <Text style={styles.metaVal}>📖 {journalName}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Vendor / Partner</Text>
                <Text style={styles.metaVal}>👤 {partnerName}</Text>
              </View>
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Source PO / Ref</Text>
                <Text style={styles.metaVal}>📄 {sourceDoc}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Journal Items Card */}
        <View style={[styles.card, shadows.sm, { marginTop: spacing.md }]}>
          <View style={styles.titleRow}>
            <Text style={styles.cardHeaderTitle}>JOURNAL ITEMS</Text>
            <Text style={styles.itemsCount}>{lines.length} Items</Text>
          </View>
          <Text style={styles.tableSub}>
            Expense and tax lines billed for this transaction
          </Text>

          {loading ? (
            <ActivityIndicator
              style={{ marginVertical: 30 }}
              color={colors.primary}
            />
          ) : lines.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>⚖️</Text>
              <Text style={styles.emptyText}>No journal items found.</Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.sm }}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.thCell, { flex: 2 }]}>Account</Text>
                <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>
                  Amount (₹)
                </Text>
              </View>

              {/* Table Rows */}
              {lines.map((ml, idx) => {
                const rawName = ml.account?.name || ml.name || 'Account';
                const code = ml.account?.code || '';
                const accName = code ? `${code} · ${rawName}` : rawName;
                const amt = Number(ml.debit || 0) || Number(ml.amount || 0) || 0;

                return (
                  <View key={ml.id || idx} style={styles.tableRow}>
                    <View style={{ flex: 2 }}>
                      <Text style={styles.accNameText}>{accName}</Text>
                      {Boolean(ml.name && ml.name !== accName) && (
                        <Text style={styles.lineDescText} numberOfLines={1}>
                          {ml.name}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[styles.drCrText, { flex: 1, textAlign: 'right' }]}>
                      ₹{amt.toFixed(2)}
                    </Text>
                  </View>
                );
              })}

              {/* Table Footer */}
              <View style={styles.tableFooter}>
                <Text style={[styles.tfCell, { flex: 2 }]}>TOTAL AMOUNT</Text>
                <Text
                  style={[
                    styles.tfCell,
                    { flex: 1, textAlign: 'right', color: colors.primary },
                  ]}>
                  ₹{totalAmount.toFixed(2)}
                </Text>
              </View>

              <View style={styles.balancedNote}>
                <Text style={styles.balancedNoteText}>
                  ✓ Total Payable to {partnerName}: ₹{totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.btnBack}
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}>
          <Text style={styles.btnBackText}>← Back to Vendor Bill</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardHeaderTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  voucherNum: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  postedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  postedBadgeText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  balancedPill: {
    backgroundColor: '#EEF0FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  balancedPillText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  metaGrid: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metaVal: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsCount: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  tableSub: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  thCell: {
    ...typography.tiny,
    color: colors.textMuted,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  accNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  lineDescText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  reconciledTag: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.secondary,
    marginTop: 2,
  },
  drCrText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  tableFooter: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  tfCell: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  balancedNote: {
    backgroundColor: '#DCFCE7',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
    alignItems: 'center',
  },
  balancedNoteText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  btnBack: {
    marginTop: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  btnBackText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
});


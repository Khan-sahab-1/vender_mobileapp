import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { purchaseOrdersApi, vendorBillsApi } from '../../api/purchase';
import client from '../../api/client';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';

function Touchable({ onPress, style, children, label }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = value => {
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityLabel={label}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      onPress={onPress}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export default function Purchasedeshboard() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [stats, setStats] = useState({
    totalPos: 0,
    toApprove: 0,
    openBills: 0,
    paidBills: 0,
    totalVendors: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const [posRes, billsRes, vendorsRes] = await Promise.all([
        purchaseOrdersApi.list({ limit: 100 }).catch(() => ({ data: [] })),
        vendorBillsApi.list({ limit: 100 }).catch(() => ({ data: [] })),
        client.get('/partners', { params: { isVendor: true, limit: 1 } }).catch(() => ({ data: { total: 0 } })),
      ]);

      const pos = Array.isArray(posRes?.data) ? posRes.data : [];
      const bills = Array.isArray(billsRes?.data) ? billsRes.data : [];
      const totalVendors = vendorsRes?.data?.total ?? 0;

      setStats({
        totalPos: pos.length,
        toApprove: pos.filter(p => p.state === 'to_approve').length,
        openBills: bills.filter(b => b.state === 'open' || b.state === 'draft').length,
        paidBills: bills.filter(b => b.state === 'paid').length,
        totalVendors,
      });
    } catch {
      // keep fallback
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      fetchStats();
    }
  }, [isFocused, fetchStats]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }>
      {/* Hero Banner */}
      <View style={[styles.heroCard, shadows.md]}>
        <View style={styles.heroHeaderRow}>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroTitle}>Procurement </Text>
            {/* <Text style={styles.heroSub}>
              Odoo-style Adhoc POs, Direct Vendor Bills & Double-Entry Accounting
            </Text> */}
          </View>
          <View style={styles.heroBadge}>
            {/* <Text style={styles.heroBadgeText}>Odoo Flow</Text> */}
          </View>
        </View>

        {/* Live KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiNum}>{stats.totalPos}</Text>
            <Text style={styles.kpiLabel}>Total POs</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiNum, { color: colors.warning }]}>{stats.toApprove}</Text>
            <Text style={styles.kpiLabel}>To Approve</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiNum, { color: '#0284C7' }]}>{stats.openBills}</Text>
            <Text style={styles.kpiLabel}>Open Bills</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiNum, { color: colors.secondary }]}>{stats.paidBills}</Text>
            <Text style={styles.kpiLabel}>Paid Bills</Text>
          </View>
        </View>

        {/* Fast Action */}
        {/* <TouchableOpacity
          style={styles.heroActionBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate(navigationScreen.PURCHASE_ORDER_FORM)}>
          <Text style={styles.heroActionBtnText}>+ Create New Adhoc PO</Text>
        </TouchableOpacity> */}
      </View>

      <Text style={styles.sectionHeading}>CORE MODULES</Text>

      {/* Module 1: Purchase Orders */}
      <Touchable
        onPress={() => navigation.navigate(navigationScreen.PURCHASE_ORDER || 'PurchaseOrder')}
        label="Purchase Orders"
        style={styles.moduleCardOuter}>
        <View style={[styles.moduleCard, shadows.sm]}>
          <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
            <Text style={styles.iconEmoji}>🛍️</Text>
          </View>
          <View style={styles.moduleInfo}>
            <View style={styles.moduleTitleRow}>
              <Text style={styles.moduleTitle}>Purchase Orders</Text>
              {stats.toApprove > 0 && (
                <View style={styles.countBadgeWarning}>
                  <Text style={styles.countBadgeWarningText}>{stats.toApprove} to approve</Text>
                </View>
              )}
            </View>
            <Text style={styles.moduleDesc}>
              Create Adhoc POs, confirm, and admin-approve for direct Vendor Bill generation.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Touchable>

      {/* Module 2: Vendor Bills */}
      <Touchable
        onPress={() => navigation.navigate(navigationScreen.VENDORS_BILLS)}
        label="Vendor Bills"
        style={styles.moduleCardOuter}>
        <View style={[styles.moduleCard, shadows.sm]}>
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.iconEmoji}>🧾</Text>
          </View>
          <View style={styles.moduleInfo}>
            <View style={styles.moduleTitleRow}>
              <Text style={styles.moduleTitle}>Vendor Bills (Invoices)</Text>
              {stats.openBills > 0 && (
                <View style={styles.countBadgeInfo}>
                  <Text style={styles.countBadgeInfoText}>{stats.openBills} active</Text>
                </View>
              )}
            </View>
            <Text style={styles.moduleDesc}>
              Validate bills, post double-entry journal items (Dr Expense/Tax, Cr AP), and register payments.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Touchable>

      {/* Master Data Section */}
      <Text style={[styles.sectionHeading, { marginTop: spacing.lg }]}>MASTER DATA</Text>

      {/* Vendors */}
      <Touchable
        onPress={() => navigation.navigate('EntityList', { entityKey: 'vendors' })}
        label="Vendors"
        style={styles.moduleCardOuter}>
        <View style={[styles.moduleCard, shadows.sm]}>
          <View style={[styles.iconBox, { backgroundColor: '#FFF7ED' }]}>
            <Text style={styles.iconEmoji}>🚚</Text>
          </View>
          <View style={styles.moduleInfo}>
            <View style={styles.moduleTitleRow}>
              <Text style={styles.moduleTitle}>Vendors</Text>
              <View style={[styles.countBadgeInfo, { backgroundColor: '#FFEDD5' }]}>
                <Text style={[styles.countBadgeInfoText, { color: '#C2410C' }]}>
                  {stats.totalVendors > 0 ? `${stats.totalVendors} suppliers` : 'Suppliers'}
                </Text>
              </View>
            </View>
            <Text style={styles.moduleDesc}>
              Manage supplier profiles, addresses, contact persons, GSTIN and bank details.
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </View>
      </Touchable>

      {/* Flow Information Banner */}
      <View style={styles.flowBanner}>
        <Text style={styles.flowBannerTitle}>⚡ Integrated Inventory & Accounting Flow:</Text>
        <Text style={styles.flowStepText}>1. PO Created with Vendor, Receiving Warehouse & Items</Text>
        <Text style={styles.flowStepText}>2. Approve PO ➔ Generates Vendor Bill & Stock Receipt (WH/IN/...)</Text>
        <Text style={styles.flowStepText}>3. Receive Goods ➔ Validates stock.moves & updates Stock Quants</Text>
        <Text style={styles.flowStepText}>4. Validate Bill & Pay ➔ Posts Balanced Ledger & Reconciles</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.md + 4,
    marginBottom: spacing.lg,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  heroTextCol: {
    flex: 1,
    marginRight: spacing.sm,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.onInk,
    fontWeight: '800',
  },
  heroSub: {
    ...typography.caption,
    color: colors.onInkMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  heroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  heroBadgeText: {
    color: colors.onInk,
    fontSize: 11,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  kpiItem: {
    alignItems: 'center',
    flex: 1,
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  kpiNum: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.onInk,
  },
  kpiLabel: {
    fontSize: 11,
    color: colors.onInkMuted,
    marginTop: 2,
  },
  heroActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroActionBtnText: {
    color: colors.textInverted,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeading: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: spacing.sm + 2,
    letterSpacing: 0.8,
  },
  moduleCardOuter: {
    width: '100%',
    marginBottom: spacing.md,
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconEmoji: {
    fontSize: 24,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  moduleTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  countBadgeWarning: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countBadgeWarningText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
  },
  countBadgeInfo: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countBadgeInfoText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  moduleDesc: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  chevron: {
    fontSize: 26,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
  flowBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: spacing.xs,
  },
  flowBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  flowStepText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import { vendorPortalApi } from '../../api/vendorPortal';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

export default function VendorDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await vendorPortalApi.getDashboard();
      setData(res);
    } catch {
      // fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading && !data) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Vendor Portal...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const vendor = data?.vendor || user?.partner || {};
  const stats = data?.stats || {
    totalOrders: 0,
    pendingOrders: 0,
    totalBills: 0,
    totalDueAmount: 0,
  };
  const recentOrders = data?.recentOrders || [];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Top Header Card */}
        <View style={[styles.heroCard, shadows.sm]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroSub}>Welcome to Vendor Portal,</Text>
              <Text style={styles.heroTitle}>{vendor.name || user?.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => navigation.navigate('VendorProfile')}>
              <Text style={styles.profileBtnText}>👤 Profile</Text>
            </TouchableOpacity>
          </View>

          {Boolean(vendor.gstin) && (
            <View style={styles.gstinPill}>
              <Text style={styles.gstinPillText}>GSTIN: {vendor.gstin}</Text>
            </View>
          )}
        </View>

        {/* 4 Stats Grid */}
        <View style={styles.statsGrid}>
          {/* Card 1: Total Orders */}
          <TouchableOpacity
            style={[styles.statCard, shadows.xs]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VendorOrders')}>
            <View style={[styles.statIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Text style={styles.statIcon}>📦</Text>
            </View>
            <Text style={styles.statVal}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Purchase Orders</Text>
          </TouchableOpacity>

          {/* Card 2: Pending Orders */}
          <TouchableOpacity
            style={[styles.statCard, shadows.xs]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VendorOrders')}>
            <View style={[styles.statIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Text style={styles.statIcon}>⏳</Text>
            </View>
            <Text style={[styles.statVal, { color: colors.warning }]}>
              {stats.pendingOrders}
            </Text>
            <Text style={styles.statLabel}>In-Progress</Text>
          </TouchableOpacity>

          {/* Card 3: Invoices */}
          <TouchableOpacity
            style={[styles.statCard, shadows.xs]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VendorBills')}>
            <View style={[styles.statIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Text style={styles.statIcon}>📑</Text>
            </View>
            <Text style={styles.statVal}>{stats.totalBills}</Text>
            <Text style={styles.statLabel}>Total Invoices</Text>
          </TouchableOpacity>

          {/* Card 4: Due Amount */}
          <TouchableOpacity
            style={[styles.statCard, shadows.xs]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VendorBills')}>
            <View style={[styles.statIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Text style={styles.statIcon}>💰</Text>
            </View>
            <Text
              style={[
                styles.statVal,
                { color: stats.totalDueAmount > 0 ? colors.danger : colors.secondary },
              ]}
              numberOfLines={1}>
              ₹{Number(stats.totalDueAmount).toLocaleString('en-IN')}
            </Text>
            <Text style={styles.statLabel}>Payment Due</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access Menu Cards */}
        <View style={styles.quickAccessRow}>
          <TouchableOpacity
            style={[styles.quickCard, shadows.sm]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VendorOrders')}>
            <Text style={styles.quickCardIcon}>📦</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickCardTitle}>My Purchase Orders</Text>
              <Text style={styles.quickCardSub}>View orders, check items & status</Text>
            </View>
            <Text style={styles.quickChevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickCard, shadows.sm]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('VendorBills')}>
            <Text style={styles.quickCardIcon}>📑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickCardTitle}>Invoices & Payments</Text>
              <Text style={styles.quickCardSub}>Track bill approvals & due balance</Text>
            </View>
            <Text style={styles.quickChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Purchase Orders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>RECENT PURCHASE ORDERS</Text>
          <TouchableOpacity onPress={() => navigation.navigate('VendorOrders')}>
            <Text style={styles.seeAllText}>View All ({stats.totalOrders}) ›</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={[styles.emptyBox, shadows.xs]}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptySub}>
              Orders placed by the company will appear here.
            </Text>
          </View>
        ) : (
          recentOrders.map(order => {
            const isConfirmed =
              order.state === 'confirmed' || order.state === 'purchase';
            return (
              <TouchableOpacity
                key={order.id}
                style={[styles.orderCard, shadows.xs]}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate('VendorOrderDetail', { orderId: order.id })
                }>
                <View style={styles.orderTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderPoNumber}>{order.poNumber}</Text>
                    <Text style={styles.orderDate}>
                      Date: {formatDate(order.date)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statePill,
                      isConfirmed ? styles.stateConfirmed : styles.statePending,
                    ]}>
                    <Text
                      style={[
                        styles.statePillText,
                        isConfirmed
                          ? styles.stateConfirmedText
                          : styles.statePendingText,
                      ]}>
                      {String(order.state || 'draft').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDivider} />

                <View style={styles.orderBottom}>
                  <Text style={styles.orderAmountLabel}>Total Value:</Text>
                  <Text style={styles.orderAmountVal}>
                    ₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodyBold,
    color: colors.textMuted,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '800',
    marginTop: 2,
  },
  profileBtn: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  profileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  gstinPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    marginTop: spacing.sm,
  },
  gstinPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3730A3',
  },
  odooPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  odooPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statIcon: {
    fontSize: 18,
  },
  statVal: {
    ...typography.h2,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  quickAccessRow: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  quickCardIcon: {
    fontSize: 24,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  quickCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  quickChevron: {
    fontSize: 20,
    color: colors.textMuted,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderPoNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  orderDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  stateConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  stateConfirmedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  statePending: {
    backgroundColor: '#FEF3C7',
  },
  statePendingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  orderDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderAmountLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  orderAmountVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
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


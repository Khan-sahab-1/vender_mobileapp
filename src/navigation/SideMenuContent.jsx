import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { navigate } from './navigationRef';
import { vendorPortalApi } from '../api/vendorPortal';
import { colors, radius, spacing, typography } from '../theme/theme';

const MENU_ITEMS = [
  { icon: '🏠', label: 'Dashboard', screen: 'Dashboard' },
  { icon: '📦', label: 'Inventory', screen: 'InventoryMenu' },
  { icon: '🛒', label: 'Sales (SO)', screen: 'SalesOrdersList' },
  { icon: '🧾', label: 'Purchase', screen: 'Purchasedashboard' },
  { icon: '📊', label: 'Accounting', screen: 'AccountingMenu' },
  { icon: '⚙️', label: 'Settings', screen: 'Settings' },
];

export default function SideMenuContent({ closeDrawer }) {
  const { user, logout } = useAuth();
  const [syncing, setSyncing] = useState(false);

  const goTo = (screen, params) => {
    closeDrawer();
    setTimeout(() => {
      navigate(screen, params);
    }, 150);
  };

  const handleSyncOdoo = () => {
    if (syncing) return;
    Alert.alert(
      'Sync Vendors from Odoo',
      'This will connect to Odoo ERP (192.168.1.6:8070), import suppliers, and create mobile vendor accounts.\n\nDefault vendor password: vendor123',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Sync',
          onPress: async () => {
            try {
              setSyncing(true);
              const res = await vendorPortalApi.syncFromOdoo();
              Alert.alert(
                'Sync Complete ✅',
                `Found ${res.totalOdooSuppliers} suppliers in Odoo.\n` +
                `• Imported: ${res.importedCount}\n` +
                `• Updated: ${res.updatedCount}\n\n` +
                `Vendors can now log in using their email and default password: vendor123`
              );
            } catch (err) {
              Alert.alert(
                'Sync Failed ❌',
                err?.response?.data?.message || err.message || 'Could not connect to Odoo ERP.'
              );
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          closeDrawer();
          logout();
        },
      },
    ]);
  };

  const initials = (user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header Profile */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.userName} numberOfLines={1}>
          {user?.name || 'Business User'}
        </Text>
        <Text style={styles.userEmail} numberOfLines={1}>
          {user?.email || 'user@example.com'}
        </Text>
        {user?.role ? (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{user.role}</Text>
          </View>
        ) : null}
      </View>

      {/* Navigation List */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>Navigation</Text>
        <View style={styles.menu}>
          {MENU_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => goTo(item.screen, item.params)}
              accessibilityRole="button"
              accessibilityLabel={item.label}>
              <View style={styles.iconBox}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Integrations Section */}
        <Text style={[styles.sectionHeader, { marginTop: spacing.md }]}>Integrations</Text>
        <View style={styles.menu}>
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={handleSyncOdoo}
            disabled={syncing}
            accessibilityRole="button"
            accessibilityLabel="Sync Odoo Vendors">
            <View style={[styles.iconBox, { backgroundColor: '#F3E8FF' }]}>
              {syncing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={styles.menuIcon}>🔄</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>
                {syncing ? 'Syncing with Odoo...' : 'Sync Odoo Vendors'}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textMuted }}>Odoo 11 ERP (192.168.1.6:8070)</Text>
            </View>
            <Text style={styles.menuChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.versionText}>Master Data App · v0.0.1</Text>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Log out">
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm + 2,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  avatarText: {
    color: colors.onInk,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  userName: {
    ...typography.h3,
    color: colors.onInk,
    fontSize: 17,
  },
  userEmail: {
    ...typography.caption,
    color: colors.onInkMuted,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.amberSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  roleBadgeText: {
    color: colors.amberText,
    ...typography.captionBold,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  scroll: {
    paddingVertical: spacing.md,
  },
  sectionHeader: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  menu: {
    paddingHorizontal: spacing.sm + 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    marginVertical: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuLabel: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
    fontSize: 15,
  },
  menuChevron: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '300',
  },
  footer: {
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceSubtle,
  },
  versionText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
  },
  logoutIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  logoutText: {
    color: colors.danger,
    ...typography.bodyBold,
  },
});

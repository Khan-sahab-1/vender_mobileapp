import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { usersApi } from '../../api/users';
import HeaderActionButton from '../../components/HeaderActionButton';
import SearchBar from '../../components/SearchBar';
import { EmptyState, ErrorBanner } from '../../components/Feedback';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, typography, shadows } from '../../theme/theme';

const MODULE_CONFIG = [
  { key: 'sale', label: 'Sale', icon: '🛒' },
  { key: 'inventory', label: 'Inventory', icon: '📦' },
  { key: 'purchase', label: 'Purchase', icon: '🧾' },
  { key: 'accounting', label: 'Accounting', icon: '💰' },
];

const ACCESS_LEVEL_COLORS = {
  management: { bg: '#EDE9FE', text: '#6D28D9', label: 'Management' },
  manager: { bg: '#D1FAE5', text: '#065F46', label: 'Manager' },
  user: { bg: '#DBEAFE', text: '#1E40AF', label: 'User' },
  none: { bg: '#F3F4F6', text: '#9CA3AF', label: 'None' },
};

export default function UsersListScreen({ navigation }) {
  const { user: currentUser } = useAuth();
  const isManagement = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.role === 'company_admin' ||
    currentUser?.role === 'management' ||
    currentUser?.userType === 'company_admin' ||
    (currentUser?.accessRights &&
      Object.values(currentUser.accessRights).some(
        val => String(val).toLowerCase() === 'management',
      )),
  );

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'internal' | 'external'

  const handleAddUser = useCallback(() => {
    navigation.navigate('UserForm', { user: null });
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Users & Access',
      headerRight: () =>
        isManagement ? (
          <HeaderActionButton
            title="+ Add User"
            icon="+"
            onPress={handleAddUser}
            accessibilityLabel="Add New User"
          />
        ) : null,
    });
  }, [navigation, handleAddUser, isManagement]);

  const loadUsers = useCallback(async () => {
    try {
      setError(null);
      const res = await usersApi.getUsers({ limit: 100 });
      const list = Array.isArray(res) ? res : res?.data || [];
      setUsers(list);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load company users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Refetch when returning from form
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUsers();
    });
    return unsubscribe;
  }, [navigation, loadUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
  };

  const filteredUsers = users.filter(item => {
    const term = (search || '').trim().toLowerCase();
    const nameMatch = !term || (item.name && item.name.toLowerCase().includes(term));
    const emailMatch = !term || (item.email && item.email.toLowerCase().includes(term));
    const phoneMatch = !term || (item.phone && item.phone.toLowerCase().includes(term));
    const matchesSearch = nameMatch || emailMatch || phoneMatch;

    if (!matchesSearch) return false;

    if (typeFilter === 'internal') {
      return item.userType === 'internal' || item.userType === 'company_admin' || !item.userType;
    }
    if (typeFilter === 'external') {
      return item.userType === 'external';
    }
    return true;
  });

  const getInitials = name => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarBg = index => {
    const palette = ['#4353F0', '#00B894', '#6366F1', '#EC4899', '#8B5CF6', '#F59E0B'];
    return palette[index % palette.length];
  };

  const renderUserItem = ({ item, index }) => {
    const isInternal =
      item.userType === 'internal' || item.userType === 'company_admin' || !item.userType;
    const access = item.accessRights || {};
    const isAdmin = Boolean(
      item.isAdmin ||
      item.role?.name === 'admin' ||
      item.userType === 'company_admin'
    );

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('UserForm', { user: item })}>
        <View style={styles.cardHeader}>
          {/* Avatar */}
          <View style={[styles.avatar, { backgroundColor: getAvatarBg(index) }]}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>

          {/* User Details */}
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {item.name || 'Unnamed User'}
              </Text>
              {isAdmin ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>👑 Administrator</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.userEmail} numberOfLines={1}>
              ✉️ {item.email}
            </Text>
            {item.phone ? (
              <Text style={styles.userPhone} numberOfLines={1}>
                📞 {item.phone}
              </Text>
            ) : null}
          </View>

          {/* Edit Chevron */}
          <View style={styles.editPill}>
            <Text style={styles.editPillText}>Edit ✎</Text>
          </View>
        </View>

        {/* Tags Row: Type + Active */}
        <View style={styles.tagsRow}>
          <View
            style={[
              styles.typeTag,
              isInternal ? styles.internalTag : styles.externalTag,
            ]}>
            <Text
              style={[
                styles.typeTagText,
                isInternal ? styles.internalTagText : styles.externalTagText,
              ]}>
              {isInternal ? '🏢 Internal' : '🌐 External'}
            </Text>
          </View>

          <View
            style={[
              styles.statusTag,
              item.active !== false ? styles.activeTag : styles.inactiveTag,
            ]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: item.active !== false ? '#10B981' : '#EF4444' },
              ]}
            />
            <Text
              style={[
                styles.statusTagText,
                { color: item.active !== false ? '#065F46' : '#991B1B' },
              ]}>
              {item.active !== false ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>

        {/* Module Access Rights Matrix */}
        <View style={styles.accessSection}>
          <Text style={styles.accessTitle}>MODULE ACCESS RIGHTS</Text>
          <View style={styles.accessGrid}>
            {MODULE_CONFIG.map(mod => {
              const level = (access[mod.key] || 'none').toLowerCase();
              const badgeStyle = ACCESS_LEVEL_COLORS[level] || ACCESS_LEVEL_COLORS.none;
              return (
                <View key={mod.key} style={styles.accessChip}>
                  <Text style={styles.moduleName}>
                    {mod.icon} {mod.label}
                  </Text>
                  <View style={[styles.levelBadge, { backgroundColor: badgeStyle.bg }]}>
                    <Text style={[styles.levelBadgeText, { color: badgeStyle.text }]}>
                      {badgeStyle.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isManagement) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="🔒"
          title="Access Restricted"
          subtitle="Management access is required to view and manage company users."
          actionLabel="Go Back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email or phone..."
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {[
          { key: 'all', label: `All (${users.length})` },
          {
            key: 'internal',
            label: `Internal (${users.filter(u => u.userType !== 'external').length})`,
          },
          {
            key: 'external',
            label: `External (${users.filter(u => u.userType === 'external').length})`,
          },
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.filterTab,
              typeFilter === tab.key && styles.filterTabActive,
            ]}
            onPress={() => setTypeFilter(tab.key)}>
            <Text
              style={[
                styles.filterTabText,
                typeFilter === tab.key && styles.filterTabTextActive,
              ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <ErrorBanner message={error} onDismiss={() => setError(null)} />
      ) : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading company users...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={item => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="👥"
              title="No Users Found"
              subtitle={
                search
                  ? `No user matched "${search}".`
                  : 'No users registered for this company yet.'
              }
              actionLabel="+ Add New User"
              onAction={handleAddUser}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchWrapper: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    ...typography.captionBold,
    color: colors.textMuted,
  },
  filterTabTextActive: {
    color: colors.textInverted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textMuted,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userName: {
    ...typography.h3,
    color: colors.text,
    flexShrink: 1,
  },
  adminBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  userEmail: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  userPhone: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  editPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginLeft: spacing.xs,
  },
  editPillText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 11,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm + 2,
    paddingTop: spacing.xs + 2,
    gap: spacing.sm,
  },
  typeTag: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  internalTag: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderWidth: 1,
  },
  externalTag: {
    backgroundColor: '#FAF5FF',
    borderColor: '#E9D5FF',
    borderWidth: 1,
  },
  typeTagText: {
    ...typography.captionBold,
    fontSize: 11,
  },
  internalTagText: {
    color: '#4338CA',
  },
  externalTagText: {
    color: '#7E22CE',
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTag: {},
  inactiveTag: {},
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusTagText: {
    ...typography.captionBold,
    fontSize: 11,
  },
  accessSection: {
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  accessTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.xs + 2,
  },
  accessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  accessChip: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleName: {
    ...typography.captionBold,
    color: colors.text,
    fontSize: 11,
  },
  levelBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});


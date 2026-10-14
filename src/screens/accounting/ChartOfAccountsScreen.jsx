import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import HeaderActionButton from '../../components/HeaderActionButton';
import { EmptyState, ErrorBanner, LoadingOverlay } from '../../components/Feedback';
import { createCrudApi } from '../../api/crud';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuth } from '../../context/AuthContext';

const TABS = [
  { key: 'ALL', label: 'All', icon: '📋' },
  { key: 'ASSET', label: 'Asset', icon: '🏛️', color: '#2563EB', bg: '#EFF6FF' },
  { key: 'LIABILITY', label: 'Liability', icon: '⚖️', color: '#D97706', bg: '#FFFBEB' },
  { key: 'INCOME', label: 'Income', icon: '💰', color: '#059669', bg: '#ECFDF5' },
  { key: 'EXPENSE', label: 'Expense', icon: '🛒', color: '#DC2626', bg: '#FEF2F2' },
];

export default function ChartOfAccountsScreen({ navigation }) {
  const { user } = useAuth();
  const accountsApi = useMemo(() => createCrudApi('/account-accounts'), []);

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');

  const handleAddNew = useCallback(() => {
    navigation.navigate('EntityForm', { entityKey: 'account-accounts', id: null });
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Chart of Accounts',
      headerRight: () => <HeaderActionButton title="+ Add" onPress={handleAddNew} />,
    });
  }, [navigation, handleAddNew]);

  const fetchAccounts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await accountsApi.list({ limit: 100 });
      const list = res?.data || res?.items || (Array.isArray(res) ? res : []);
      const filtered = user?.companyId
        ? list.filter((acc) => !acc.companyId || acc.companyId === user.companyId)
        : list;
      setAccounts(filtered);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accountsApi, user?.companyId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      fetchAccounts(true);
    });
    return unsub;
  }, [navigation, fetchAccounts]);

  const getInternalGroup = (acc) => {
    if (acc.accountType?.internalGroup) {
      return String(acc.accountType.internalGroup).toUpperCase();
    }
    const t = String(acc.type || '').toLowerCase();
    if (['receivable', 'liquidity', 'bank', 'cash', 'current_assets', 'asset'].includes(t)) {
      return 'ASSET';
    }
    if (['payable', 'tax', 'liability'].includes(t)) {
      return 'LIABILITY';
    }
    if (['income'].includes(t)) {
      return 'INCOME';
    }
    if (['expense'].includes(t)) {
      return 'EXPENSE';
    }
    return 'ASSET';
  };

  const counts = useMemo(() => {
    const map = { ALL: accounts.length, ASSET: 0, LIABILITY: 0, INCOME: 0, EXPENSE: 0 };
    for (const acc of accounts) {
      const g = getInternalGroup(acc);
      if (map[g] !== undefined) {
        map[g] += 1;
      }
    }
    return map;
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const g = getInternalGroup(acc);
      if (activeTab !== 'ALL' && g !== activeTab) {
        return false;
      }
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const codeMatch = String(acc.code || '').toLowerCase().includes(query);
        const nameMatch = String(acc.name || '').toLowerCase().includes(query);
        const groupMatch = String(acc.group?.name || '').toLowerCase().includes(query);
        const typeMatch = String(acc.accountType?.name || '').toLowerCase().includes(query);
        return codeMatch || nameMatch || groupMatch || typeMatch;
      }
      return true;
    });
  }, [accounts, activeTab, search]);

  // Group accounts by Account Group
  const groupedData = useMemo(() => {
    const map = new Map();
    for (const acc of filteredAccounts) {
      const grpKey = acc.group?.name || 'General / Ungrouped';
      const prefix = acc.group?.codePrefix ? `[${acc.group.codePrefix}] ` : '';
      const displayTitle = `${prefix}${grpKey}`;
      if (!map.has(displayTitle)) {
        map.set(displayTitle, {
          title: displayTitle,
          groupObj: acc.group,
          items: [],
        });
      }
      map.get(displayTitle).items.push(acc);
    }
    return Array.from(map.values());
  }, [filteredAccounts]);

  const handleDelete = (acc) => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete "${acc.code} - ${acc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await accountsApi.remove(acc.id);
              await fetchAccounts(true);
            } catch (err) {
              Alert.alert('Error', getErrorMessage(err));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderBadge = (group) => {
    let color = '#2563EB';
    let bg = '#EFF6FF';
    if (group === 'LIABILITY') {
      color = '#D97706';
      bg = '#FFFBEB';
    } else if (group === 'INCOME') {
      color = '#059669';
      bg = '#ECFDF5';
    } else if (group === 'EXPENSE') {
      color = '#DC2626';
      bg = '#FEF2F2';
    }
    return (
      <View style={[styles.typeBadge, { backgroundColor: bg }]}>
        <Text style={[styles.typeBadgeText, { color }]}>{group}</Text>
      </View>
    );
  };

  if (loading && !refreshing && accounts.length === 0) {
    return (
      <ScreenContainer>
        <LoadingOverlay message="Loading Chart of Accounts..." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search code, name, group..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isSelected = activeTab === tab.key;
          const count = counts[tab.key] || 0;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isSelected && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[styles.countBadge, isSelected && styles.countBadgeActive]}>
                <Text style={[styles.countText, isSelected && styles.countTextActive]}>
                  {count}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Accounts List */}
      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.title}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAccounts(true)} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Accounts Found"
            message={search ? `No accounts matched "${search}".` : 'No accounts under this primary head.'}
            actionLabel="+ Add New Account"
            onAction={handleAddNew}
          />
        }
        renderItem={({ item: section }) => (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📁 {section.title}</Text>
              <Text style={styles.sectionCount}>{section.items.length} accounts</Text>
            </View>

            {section.items.map((acc) => {
              const primaryGroup = getInternalGroup(acc);
              const typeName = acc.accountType?.name || acc.type || 'Standard';
              return (
                <TouchableOpacity
                  key={acc.id}
                  style={styles.card}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('EntityForm', { entityKey: 'account-accounts', id: acc.id })}
                  onLongPress={() => handleDelete(acc)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{acc.code}</Text>
                    </View>
                    <View style={styles.badgeRow}>
                      {renderBadge(primaryGroup)}
                      {acc.reconcile ? (
                        <View style={styles.reconcileBadge}>
                          <Text style={styles.reconcileBadgeText}>✓ Reconcile</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <Text style={styles.accountName}>{acc.name}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Type:</Text>
                    <Text style={styles.metaValue}>{typeName}</Text>
                    <Text style={styles.metaDivider}>•</Text>
                    <Text style={styles.metaLabel}>Currency:</Text>
                    <Text style={styles.metaValue}>{acc.currency || 'INR'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 4,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  clearBtnText: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 2,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 11,
  },
  tabTextActive: {
    color: colors.textInverted,
  },
  countBadge: {
    marginLeft: 4,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  countText: {
    ...typography.tiny,
    color: colors.textMuted,
    fontSize: 10,
  },
  countTextActive: {
    color: colors.textInverted,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  sectionContainer: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionCount: {
    ...typography.tiny,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  codeBadge: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  codeText: {
    ...typography.captionBold,
    fontFamily: 'Courier',
    color: colors.ink,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: {
    ...typography.tiny,
    fontWeight: '700',
    fontSize: 10,
  },
  reconcileBadge: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  reconcileBadgeText: {
    ...typography.tiny,
    color: '#16A34A',
    fontSize: 9,
  },
  accountName: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: 4,
  },
  metaValue: {
    ...typography.captionBold,
    color: colors.inkSoft,
  },
  metaDivider: {
    marginHorizontal: spacing.xs + 2,
    color: colors.border,
  },
});


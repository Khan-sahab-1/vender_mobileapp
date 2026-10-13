import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import ListRow from '../../components/ListRow';
import { getEntity, SETTINGS_MENU } from '../../config/entities';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function SettingsScreen({ navigation }) {
  const { user } = useAuth();

  // User is management if admin, company_admin, or any module has management level
  const isManagement = Boolean(
    user?.isAdmin ||
    user?.role === 'admin' ||
    user?.role === 'company_admin' ||
    user?.role === 'management' ||
    user?.userType === 'company_admin' ||
    (user?.accessRights &&
      Object.values(user.accessRights).some(
        val => String(val).toLowerCase() === 'management',
      )),
  );

  const sections = (SETTINGS_MENU || [])
    .map(section => {
      let items = (section.data || []).map(getEntity).filter(Boolean);
      if (!isManagement) {
        items = items.filter(item => item.key !== 'users');
      }
      return {
        ...section,
        data: items,
      };
    })
    .filter(section => section.data.length > 0);

  return (
    <ScreenContainer>
      <SectionList
        sections={sections}
        keyExtractor={item => item?.key || Math.random().toString()}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => {
          if (!item) return null;
          return (
            <ListRow
              icon={item.icon || '📄'}
              title={item.title || 'Untitled'}
              subtitle={
                item.key === 'users'
                  ? 'Manage company users & access rights'
                  : `Manage ${(item.title || '').toLowerCase()}`
              }
              onPress={() => {
                if (item.key === 'users') {
                  navigation.navigate('UsersList');
                } else {
                  navigation.navigate('EntityList', { entityKey: item.key });
                }
              }}
            />
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  countBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  countBadgeText: {
    ...typography.captionBold,
    color: colors.textMuted,
    fontSize: 10,
  },
});

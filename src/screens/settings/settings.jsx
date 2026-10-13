import React from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import ListRow from '../../components/ListRow';
import { getEntity, SETTINGS_MENU } from '../../config/entities';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function SettingsScreen({ navigation }) {
  const sections = (SETTINGS_MENU || []).map(section => ({
    ...section,
    data: (section.data || []).map(getEntity).filter(Boolean),
  }));

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
              subtitle={`Manage ${(item.title || '').toLowerCase()}`}
              onPress={() => navigation.navigate('EntityList', { entityKey: item.key })}
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

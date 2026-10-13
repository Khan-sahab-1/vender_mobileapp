import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { LoadingOverlay, ErrorBanner } from '../../components/Feedback';
import { createCrudApi } from '../../api/crud';
import { getErrorMessage } from '../../api/client';
import { getEntity } from '../../config/entities';
import { buildInitialValues, buildPayload, validateRequired } from '../../utils/formTransforms';
import { colors, radius, spacing, typography } from '../../theme/theme';

export default function EntityFormScreen({ route, navigation }) {
  const { entityKey, id } = route.params || {};
  const entity = getEntity(entityKey);
  const api = entity ? createCrudApi(entity.endpoint) : null;
  const isEdit = !!id;

  const [values, setValues] = useState(() => (entity ? buildInitialValues(entity, null) : {}));
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useLayoutEffect(() => {
    if (!entity) return;
    navigation.setOptions({
      title: isEdit ? `Edit ${entity.singular}` : `New ${entity.singular}`,
    });
  }, [navigation, entity, isEdit]);

  useEffect(() => {
    if (!isEdit || !api || !entity) return;
    (async () => {
      try {
        setLoading(true);
        const record = await api.get(id);
        setValues(buildInitialValues(entity, record));
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setFieldValue = (name, val) => setValues(prev => ({ ...prev, [name]: val }));

  const visibleFields = entity?.fields
    ? entity.fields.filter(f => !(f.createOnly && isEdit) && !f.hidden)
    : [];

  const handleSave = async () => {
    if (!entity || !api) return;
    const missing = validateRequired(entity, { ...values, __isEdit: isEdit });
    if (missing.length) {
      Alert.alert('Missing Information', `Please fill in required fields: ${missing.join(', ')}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload(entity, values);
      if (isEdit) {
        await api.update(id, payload);
      } else {
        await api.create(payload);
      }
      navigation.goBack();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  if (!entity) {
    return (
      <ScreenContainer>
        <ErrorBanner message={`Entity configuration for "${entityKey}" not found.`} />
      </ScreenContainer>
    );
  }

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingOverlay full label={`Loading ${entity.singular.toLowerCase()}...`} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.banner}>
          <View style={styles.bannerIconBox}>
            <Text style={styles.bannerIcon}>{entity.icon}</Text>
          </View>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>
              {isEdit ? `Update ${entity.singular}` : `Create New ${entity.singular}`}
            </Text>
            <Text style={styles.bannerSubtitle}>
              {entity.endpoint}
            </Text>
          </View>
        </View>

        <ErrorBanner message={error} />

        <View style={styles.formCard}>
          {visibleFields.map(field => (
            <FormField
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={val => setFieldValue(field.name, val)}
            />
          ))}
        </View>

        <View style={styles.buttonGroup}>
          <Button
            title={isEdit ? 'Save Changes' : `Create ${entity.singular}`}
            onPress={handleSave}
            loading={saving}
            size="lg"
          />
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
            disabled={saving}
            style={styles.cancelBtn}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  bannerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  buttonGroup: {
    marginTop: spacing.xs,
  },
  cancelBtn: {
    marginTop: spacing.sm,
  },
});

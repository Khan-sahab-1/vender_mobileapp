import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ScrollView, Alert, View, Text, StyleSheet } from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import FormField from '../../components/FormField';
import { LoadingOverlay, ErrorBanner } from '../../components/Feedback';
import { createCrudApi } from '../../api/crud';
import client, { getErrorMessage } from '../../api/client';
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

  const setFieldValue = (name, val) => {
    setValues(prev => {
      const next = { ...prev, [name]: val };
      if (name === 'companyType') {
        if (val === 'individual') {
          next.companyStructure = null;
        } else if (val === 'company') {
          next.parentId = null;
          if (!next.companyStructure) {
            next.companyStructure = 'pvt_ltd';
          }
        }
      }
      return next;
    });
  };

  // Auto-fetch default accounting and location relations for Customers & Vendors
  useEffect(() => {
    if (isEdit) return;

    const isCust = entityKey === 'customers' || entityKey === 'customer';
    const isVend = entityKey === 'vendors' || entityKey === 'vendor';

    if (isCust) {
      client.get('/account-accounts', { params: { type: 'receivable', limit: 1 } })
        .then(res => {
          const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          const acc = list[0];
          if (acc) {
            setFieldValue('accountReceivableId', { id: acc.id, label: `${acc.code} - ${acc.name}` });
          }
        })
        .catch(() => {});

      client.get('/locations', { params: { usage: 'customer', limit: 1 } })
        .then(res => {
          const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          const loc = list[0];
          if (loc) {
            setFieldValue('customerLocationId', { id: loc.id, label: loc.completeName || loc.name });
          }
        })
        .catch(() => {});
    }

    if (isVend) {
      client.get('/account-accounts', { params: { type: 'payable', limit: 1 } })
        .then(res => {
          const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          const acc = list[0];
          if (acc) {
            setFieldValue('accountPayableId', { id: acc.id, label: `${acc.code} - ${acc.name}` });
          }
        })
        .catch(() => {});

      client.get('/locations', { params: { usage: 'vendor', limit: 1 } })
        .then(res => {
          const list = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : []);
          const loc = list[0];
          if (loc) {
            setFieldValue('vendorLocationId', { id: loc.id, label: loc.completeName || loc.name });
          }
        })
        .catch(() => {});
    }
  }, [isEdit, entityKey]);

  const isIndividual = values?.companyType === 'individual';
  const isCompany = !isIndividual;

  const visibleFields = entity?.fields
    ? entity.fields.filter(f => {
        if (f.createOnly && isEdit) return false;
        if (f.hidden) return false;
        if (entityKey === 'customers' || entityKey === 'customer') {
          if (['accountPayableId', 'vendorLocationId', 'isVendor'].includes(f.name)) return false;
        }
        if (entityKey === 'vendors' || entityKey === 'vendor') {
          if (['accountReceivableId', 'customerLocationId', 'isCustomer'].includes(f.name)) return false;
        }

        // Conditional display based on Company vs Individual
        if (f.name === 'companyStructure' && !isCompany) return false;
        if (f.name === 'parentId' && !isIndividual) return false;

        return true;
      })
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
      if (values.companyType === 'company') {
        delete payload.parentId;
        if (!payload.companyStructure) {
          payload.companyStructure = 'pvt_ltd';
        }
      } else if (values.companyType === 'individual') {
        delete payload.companyStructure;
        if (!payload.parentId) {
          delete payload.parentId;
        }
      }
      delete payload.creditLimit;
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
          {visibleFields.map(field => {
            let fieldProps = field;
            if (field.name === 'parentId') {
              const rel =
                entityKey === 'vendors' || entityKey === 'vendor'
                  ? 'vendors'
                  : 'customers';
              fieldProps = {
                ...field,
                relation: rel,
                params: {
                  companyType: 'company',
                  strict: true,
                  ...(isEdit ? { excludeId: id } : {}),
                },
              };
            } else if (
              field.name === 'name' &&
              (entityKey === 'customers' ||
                entityKey === 'customer' ||
                entityKey === 'vendors' ||
                entityKey === 'vendor')
            ) {
              const isVend = entityKey === 'vendors' || entityKey === 'vendor';
              fieldProps = {
                ...field,
                label: isIndividual
                  ? isVend
                    ? 'Vendor Contact Name'
                    : 'Customer Contact Name'
                  : isVend
                  ? 'Vendor Company Name'
                  : 'Customer Company Name',
                placeholder: isIndividual
                  ? 'e.g. John Doe'
                  : isVend
                  ? 'e.g. Acme Supplies Pvt Ltd'
                  : 'e.g. Acme Corp',
              };
            } else if (isEdit && field.relation === entityKey) {
              fieldProps = {
                ...field,
                params: { ...(field.params || {}), excludeId: id },
              };
            }
            return (
              <FormField
                key={field.name}
                field={fieldProps}
                value={values[field.name]}
                onChange={val => setFieldValue(field.name, val)}
              />
            );
          })}
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

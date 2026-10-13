import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { colors, radius, spacing, typography } from '../theme/theme';
import PickerModal from './PickerModal';
import ChipsField from './ChipsField';
import ArrayField from './ArrayField';
import { createCrudApi } from '../api/crud';
import { getEntity } from '../config/entities';

function FocusedTextInput({ multiline, style, ...props }) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      {...props}
      multiline={multiline}
      selectionColor={colors.primary}
      placeholderTextColor={colors.textMuted}
      onFocus={e => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={e => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[
        styles.input,
        multiline && styles.textarea,
        focused && styles.inputFocused,
        style,
      ]}
    />
  );
}

export default function FormField({ field, value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  switch (field.type) {
    case 'text':
    case 'password':
      return (
        <Labeled field={field}>
          <FocusedTextInput
            value={value ?? ''}
            onChangeText={onChange}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            secureTextEntry={field.type === 'password'}
            autoCapitalize={field.type === 'password' ? 'none' : 'sentences'}
          />
        </Labeled>
      );

    case 'textarea':
      return (
        <Labeled field={field}>
          <FocusedTextInput
            value={value ?? ''}
            onChangeText={onChange}
            placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
            multiline
            numberOfLines={4}
          />
        </Labeled>
      );

    case 'number':
      return (
        <Labeled field={field}>
          <FocusedTextInput
            value={value === undefined || value === null ? '' : String(value)}
            onChangeText={text => onChange(text === '' ? null : Number(text.replace(/[^0-9.-]/g, '')))}
            keyboardType="numeric"
            placeholder={field.placeholder || '0'}
          />
        </Labeled>
      );

    case 'date':
      return (
        <Labeled field={field}>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setDatePickerOpen(true)}
            activeOpacity={0.7}>
            <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
              {value || field.placeholder || 'Select date...'}
            </Text>
            <Text style={{ fontSize: 16 }}>📅</Text>
          </TouchableOpacity>
          <DateTimePickerModal
            isVisible={datePickerOpen}
            mode="date"
            date={
              (() => {
                if (value) {
                  const d = new Date(value);
                  if (!isNaN(d.getTime())) return d;
                }
                return new Date();
              })()
            }
            onConfirm={d => {
              const yyyy = d.getFullYear();
              const mm = String(d.getMonth() + 1).padStart(2, '0');
              const dd = String(d.getDate()).padStart(2, '0');
              onChange(`${yyyy}-${mm}-${dd}`);
              setDatePickerOpen(false);
            }}
            onCancel={() => setDatePickerOpen(false)}
          />
        </Labeled>
      );

    case 'boolean':
      return (
        <View style={styles.switchRow}>
          <View style={styles.switchLabelWrap}>
            <Text style={styles.label}>{field.label}</Text>
            {field.description ? (
              <Text style={styles.fieldDescription}>{field.description}</Text>
            ) : null}
          </View>
          <Switch
            value={!!value}
            onValueChange={onChange}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      );

    case 'select': {
      const selectedOption = field.options?.find(o => o.value === value);
      return (
        <Labeled field={field}>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}>
            <Text style={selectedOption ? styles.selectValue : styles.selectPlaceholder}>
              {selectedOption?.label ?? 'Select option...'}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <PickerModal
            visible={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={item => onChange(item.value)}
            title={field.label}
            options={field.options}
          />
        </Labeled>
      );
    }

    case 'relation':
      return <RelationField field={field} value={value} onChange={onChange} />;

    case 'multiselect-relation':
      return (
        <Labeled field={field}>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}>
            <Text style={value?.length ? styles.selectValue : styles.selectPlaceholder}>
              {value?.length ? `${value.length} selected` : `Select ${field.label.toLowerCase()}...`}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <ChipsField
            items={value ?? []}
            onRemove={id => onChange((value ?? []).filter(v => v.id !== id))}
          />
          <PickerModal
            visible={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={item => {
              const exists = (value ?? []).some(v => v.id === item.value);
              if (!exists) onChange([...(value ?? []), { id: item.value, label: item.label }]);
            }}
            title={field.label}
            relation={field.relation}
            params={field.params}
          />
        </Labeled>
      );

    case 'text-array':
      return (
        <Labeled field={field}>
          <FocusedTextInput
            value={(value ?? []).join(', ')}
            onChangeText={text =>
              onChange(
                text
                  .split(',')
                  .map(t => t.trim())
                  .filter(Boolean),
              )
            }
            placeholder={field.placeholder || 'e.g. tag1, tag2'}
          />
        </Labeled>
      );

    case 'array':
      return <ArrayField field={field} value={value ?? []} onChange={onChange} />;

    default:
      return null;
  }
}

function RelationField({ field, value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [resolvedLabel, setResolvedLabel] = useState(value?.label);

  useEffect(() => {
    const isRawId = value?.id && (!value?.label || value.label === value.id);
    if (isRawId && field.relation) {
      const entity = getEntity(field.relation);
      if (entity) {
        const api = createCrudApi(entity.endpoint);
        api.get(value.id).then(record => {
          if (record) {
            const secondary = entity.secondaryField;
            const label =
              record.completeName ||
              record[entity.primaryField] ||
              (secondary ? record[secondary] : null) ||
              record.name ||
              value.id;
            setResolvedLabel(label);
            onChange({ id: value.id, label });
          }
        }).catch(() => {});
      }
    } else {
      setResolvedLabel(value?.label);
    }
  }, [value?.id, value?.label, field.relation]);

  const displayLabel = resolvedLabel || (value?.label !== value?.id ? value?.label : null);

  return (
    <Labeled field={field}>
      <TouchableOpacity
        style={styles.selectInput}
        onPress={() => setPickerOpen(true)}
        activeOpacity={0.7}>
        <Text style={displayLabel ? styles.selectValue : styles.selectPlaceholder}>
          {displayLabel ?? `Select ${field.label.toLowerCase()}...`}
        </Text>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
      <PickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={item => {
          setResolvedLabel(item.label);
          onChange({ id: item.value, label: item.label });
        }}
        title={field.label}
        relation={field.relation}
        params={field.params}
      />
    </Labeled>
  );
}

function Labeled({ field, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {field.label}
        {field.required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: spacing.xs + 2,
    fontSize: 13,
  },
  required: {
    color: colors.danger,
    fontWeight: '700',
  },
  fieldDescription: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    color: colors.text,
    ...typography.body,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: spacing.sm + 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  switchLabelWrap: {
    flex: 1,
    marginRight: spacing.md,
  },
  selectInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  selectValue: {
    ...typography.bodyBold,
    color: colors.text,
  },
  selectPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '300',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';
import FormField from './FormField';
import Button from './Button';

function buildEmptyItem(itemFields) {
  const item = {};
  itemFields.forEach(f => {
    item[f.name] = f.default ?? (f.type === 'boolean' ? false : f.type === 'array' ? [] : '');
  });
  return item;
}

export default function ArrayField({ field, value, onChange }) {
  const items = value ?? [];

  const updateItem = (index, name, val) => {
    const next = items.map((item, i) => (i === index ? { ...item, [name]: val } : item));
    onChange(next);
  };

  const removeItem = index => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    onChange([...items, buildEmptyItem(field.itemFields)]);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>{field.label}</Text>
        <Text style={styles.counter}>{items.length} {items.length === 1 ? 'item' : 'items'}</Text>
      </View>

      {items.map((item, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index + 1}</Text>
            </View>
            <Text style={styles.cardTitle}>
              {field.itemLabel ?? 'Item'} {index + 1}
            </Text>
            <TouchableOpacity
              onPress={() => removeItem(index)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.removeBtn}
              accessibilityRole="button"
              accessibilityLabel={`Remove item ${index + 1}`}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>

          {field.itemFields.map(subField => (
            <FormField
              key={subField.name}
              field={subField}
              value={item[subField.name]}
              onChange={val => updateItem(index, subField.name, val)}
            />
          ))}
        </View>
      ))}

      <Button
        title={`+ Add ${field.itemLabel ?? 'Item'}`}
        variant="outline"
        size="sm"
        onPress={addItem}
        style={styles.addBtn}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  label: {
    ...typography.captionBold,
    color: colors.text,
    fontSize: 13,
  },
  counter: {
    ...typography.caption,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
    paddingBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  indexBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 4,
  },
  indexText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    ...typography.bodyBold,
    color: colors.text,
    flex: 1,
  },
  removeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  removeText: {
    color: colors.danger,
    ...typography.captionBold,
    fontSize: 12,
  },
  addBtn: {
    marginTop: spacing.xs,
  },
});

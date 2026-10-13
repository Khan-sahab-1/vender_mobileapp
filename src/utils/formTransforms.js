import { getEntity } from '../config/entities';

/** 'categoryId' -> 'category', 'purchaseUomId' -> 'purchaseUom' */
const singularRelatedKey = fieldName => fieldName.replace(/Id$/, '');

/** 'salesTaxIds' -> 'salesTaxes', 'purchaseTaxIds' -> 'purchaseTaxes' */
const pluralRelatedKey = fieldName => {
  const base = fieldName.replace(/Ids$/, '');
  return /[xsz]$|[sc]h$/.test(base) ? `${base}es` : `${base}s`;
};

function relatedLabel(relationKey, record) {
  if (!record) return String(record ?? '');
  const relatedEntity = getEntity(relationKey);
  const primary = relatedEntity?.primaryField ?? 'name';
  const secondary = relatedEntity?.secondaryField;
  return record.completeName || record[primary] || (secondary ? record[secondary] : null) || record.name || record.id;
}

/** Builds the initial form state (keyed by field.name) from an API record, or defaults for a new record. */
export function buildInitialValues(entity, record) {
  const values = {};
  entity.fields.forEach(field => {
    if (field.createOnly && record) {
      // e.g. password: don't prefill / don't require again on edit
      return;
    }
    if (!record) {
      values[field.name] =
        entity.defaultValues?.[field.name] ??
        field.default ??
        (field.type === 'boolean' ? false : field.type === 'array' ? [] : null);
      return;
    }

    if (field.type === 'relation') {
      const relatedKey = singularRelatedKey(field.name);
      const nested = record[relatedKey];
      if (nested && typeof nested === 'object') {
        values[field.name] = { id: nested.id, label: relatedLabel(field.relation, nested) };
      } else if (record[field.name]) {
        values[field.name] = { id: record[field.name], label: record[field.name] };
      } else {
        values[field.name] = null;
      }
      return;
    }

    if (field.type === 'multiselect-relation') {
      const relatedKey = pluralRelatedKey(field.name);
      const nestedArr = record[relatedKey];
      values[field.name] = Array.isArray(nestedArr)
        ? nestedArr.map(r => ({ id: r.id, label: relatedLabel(field.relation, r) }))
        : [];
      return;
    }

    if (field.type === 'array') {
      values[field.name] = Array.isArray(record[field.name])
        ? record[field.name].map(item => {
            const mapped = {};
            field.itemFields.forEach(subField => {
              const raw = item[subField.name];
              if (subField.type === 'relation' && raw) {
                mapped[subField.name] = { id: raw, label: String(raw) };
              } else {
                mapped[subField.name] = raw ?? subField.default ?? '';
              }
            });
            return mapped;
          })
        : [];
      return;
    }

    values[field.name] = record[field.name] ?? field.default ?? null;
  });
  return values;
}

/** Converts the form's internal state back into an API create/update payload. */
export function buildPayload(entity, values) {
  const payload = {};
  entity.fields.forEach(field => {
    const value = values[field.name];

    if (field.type === 'relation') {
      if (value?.id) payload[field.name] = value.id;
      return;
    }
    if (field.type === 'multiselect-relation') {
      payload[field.name] = (value ?? []).map(v => v.id);
      return;
    }
    if (field.type === 'array') {
      payload[field.name] = (value ?? []).map(item => {
        const mapped = {};
        field.itemFields.forEach(subField => {
          const raw = item[subField.name];
          if (subField.type === 'relation') {
            mapped[subField.name] = raw?.id ?? raw ?? undefined;
          } else if (subField.type === 'number') {
            mapped[subField.name] = raw === '' || raw === null ? undefined : Number(raw);
          } else {
            mapped[subField.name] = raw === '' ? undefined : raw;
          }
        });
        return mapped;
      });
      return;
    }
    if (field.type === 'password') {
      if (value) payload[field.name] = value; // omit if blank (edit mode, unchanged)
      return;
    }
    if (value === null || value === undefined || value === '') {
      return; // omit empty optional fields entirely
    }
    payload[field.name] = value;
  });
  return payload;
}

export function validateRequired(entity, values) {
  const missing = entity.fields.filter(field => {
    if (field.createOnly && values.__isEdit) return false;
    if (field.hidden) return false;
    if (!field.required) return false;
    const v = values[field.name];
    if (field.type === 'relation') return !v?.id;
    return v === null || v === undefined || v === '';
  });
  return missing.map(f => f.label);
}

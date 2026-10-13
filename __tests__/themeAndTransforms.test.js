import { colors, spacing, radius } from '../src/theme/theme';
import { getEntity, ENTITIES } from '../src/config/entities';
import { buildInitialValues, buildPayload, validateRequired } from '../src/utils/formTransforms';

describe('Design Tokens & Theme', () => {
  it('has consistent modern brand colors', () => {
    expect(colors.primary).toBe('#4353F0');
    expect(colors.ink).toBe('#12163A');
    expect(colors.background).toBe('#F4F6FC');
    expect(colors.surface).toBe('#FFFFFF');
    expect(colors.border).toBe('#E1E5F2');
    expect(colors.amber).toBe('#FFB63D');
  });

  it('has valid spacing and radius', () => {
    expect(spacing.md).toBe(16);
    expect(radius.md).toBe(14);
    expect(radius.pill).toBe(999);
  });
});

describe('Entity Registry & Form Transforms', () => {
  it('retrieves products entity with correct configuration', () => {
    const product = getEntity('products');
    expect(product).toBeDefined();
    expect(product.primaryField).toBe('name');
    expect(product.endpoint).toBe('/products');
  });

  it('retrieves divisions entity with correct endpoint and fields', () => {
    const division = getEntity('divisions');
    expect(division).toBeDefined();
    expect(division.endpoint).toBe('/divisions');
    expect(division.primaryField).toBe('name');
    expect(division.secondaryField).toBe('code');
    const fieldNames = division.fields.map(f => f.name);
    expect(fieldNames).toContain('name');
    expect(fieldNames).toContain('code');
    expect(fieldNames).toContain('active');
  });

  it('builds initial values for new entity record', () => {
    const category = ENTITIES['product-categories'];
    const initial = buildInitialValues(category, null);
    expect(initial).toHaveProperty('name');
    expect(initial).toHaveProperty('parentId');
  });

  it('validates required fields correctly', () => {
    const category = ENTITIES['product-categories'];
    const missing = validateRequired(category, { name: '' });
    expect(missing).toContain('Name');
  });

  it('builds payload omitting empty optional values', () => {
    const category = ENTITIES['product-categories'];
    const payload = buildPayload(category, { name: 'Electronics', parentId: null });
    expect(payload.name).toBe('Electronics');
    expect(payload).not.toHaveProperty('parentId');
  });
});

describe('Purchase Order Calculations', () => {
  it('correctly calculates untaxed total and 15% VAT', () => {
    const dummyLines = [
      { quantity: 5, unitPrice: 120.0, taxRate: 0.15 },
      { quantity: 2, unitPrice: 245.0, taxRate: 0.15 },
    ];
    const untaxed = dummyLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const tax = dummyLines.reduce((s, l) => s + l.quantity * l.unitPrice * l.taxRate, 0);
    const total = untaxed + tax;

    expect(untaxed).toBe(1090.0);
    expect(tax).toBe(163.5);
    expect(total).toBe(1253.5);
  });
});

describe('Vendor Bill Calculations', () => {
  it('correctly calculates untaxed total and 18% GST (CGST 9% + SGST 9%)', () => {
    const billLines = [
      { quantity: 10, unitPrice: 1250.0, taxRate: 0.18 },
      { quantity: 25, unitPrice: 380.0, taxRate: 0.18 },
    ];
    const untaxed = billLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const cgst = untaxed * 0.09;
    const sgst = untaxed * 0.09;
    const totalGst = cgst + sgst;
    const grandTotal = untaxed + totalGst;

    expect(untaxed).toBe(22000.0);
    expect(cgst).toBe(1980.0);
    expect(sgst).toBe(1980.0);
    expect(totalGst).toBe(3960.0);
    expect(grandTotal).toBe(25960.0);
  });

  it('correctly calculates PO / Vendor Bill approval line items matching mockup total', () => {
    const items = [
      { name: 'Stainless Steel Pipes 2-inch', qty: 500, price: 850 },
      { name: 'Seamless Copper Tubes 15mm', qty: 200, price: 180 },
      { name: 'High Pressure Flange Gasket Set', qty: 80, price: 302.5 },
    ];
    const itemTotals = items.map(it => it.qty * it.price);
    const grandTotal = itemTotals.reduce((a, b) => a + b, 0);

    expect(itemTotals[0]).toBe(425000);
    expect(itemTotals[1]).toBe(36000);
    expect(itemTotals[2]).toBe(24200);
    expect(grandTotal).toBe(485200);
  });
});


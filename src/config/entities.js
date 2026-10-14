/**
 * Central registry describing every Master Data entity: its REST endpoint,
 * how to render it in a list, and what fields its create/edit form has.
 * The generic EntityListScreen / EntityFormScreen read this config so we
 * don't need a bespoke screen per module.
 *
 * Field types understood by <FormField />:
 *   text | textarea | number | boolean | password | date
 *   select                -> static options: [{ value, label }]
 *   relation               -> picks one record from another entity (stores id)
 *   multiselect-relation    -> picks many records from another entity (stores id[])
 *   text-array              -> comma separated free text, stored as string[]
 *   array                   -> repeatable group of sub-fields (itemFields), stored as object[]
 */

export const ENTITIES = {
  'product-categories': {
    key: 'product-categories',
    endpoint: '/product-categories',
    title: 'Product Categories',
    singular: 'Category',
    icon: '📁',
    primaryField: 'name',
    secondaryField: 'completeName',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      {
        name: 'parentId',
        label: 'Parent Category',
        type: 'relation',
        relation: 'product-categories',
      },
    ],
  },

  'uom-categories': {
    key: 'uom-categories',
    endpoint: '/uom-categories',
    title: 'UoM Categories',
    singular: 'UoM Category',
    icon: '📏',
    primaryField: 'name',
    fields: [{ name: 'name', label: 'Name', type: 'text', required: true }],
  },

  uoms: {
    key: 'uoms',
    endpoint: '/uoms',
    title: 'Units of Measure',
    singular: 'Unit of Measure',
    icon: '⚖️',
    primaryField: 'name',
    secondaryField: 'code',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', placeholder: 'e.g. kg' },
      {
        name: 'categoryId',
        label: 'UoM Category',
        type: 'relation',
        relation: 'uom-categories',
        required: true,
      },
      {
        name: 'uomType',
        label: 'Type',
        type: 'select',
        options: [
          { value: 'reference', label: 'Reference' },
          { value: 'bigger', label: 'Bigger' },
          { value: 'smaller', label: 'Smaller' },
        ],
        default: 'reference',
      },
      { name: 'factor', label: 'Factor (vs. reference unit)', type: 'number', default: 1 },
      { name: 'rounding', label: 'Rounding', type: 'number', default: 0.01 },
    ],
  },

  products: {
    key: 'products',
    endpoint: '/products',
    title: 'Products',
    singular: 'Product',
    icon: '📦',
    primaryField: 'name',
    secondaryField: 'sku',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'sku', label: 'SKU / Internal Reference', type: 'text' },
      { name: 'barcode', label: 'Barcode', type: 'text' },
      {
        name: 'tracking',
        label: 'Tracking (Traceability)',
        type: 'select',
        options: [
          { value: 'none', label: 'No Tracking' },
          { value: 'lot', label: 'By Lots' },
          { value: 'serial', label: 'By Unique Serial Number' },
        ],
        default: 'none',
      },
      {
        name: 'lotNumber',
        label: 'Lot / Serial Number',
        type: 'text',
        placeholder: 'e.g. LOT-2026-001 or SN-88231',
      },
      {
        name: 'type',
        label: 'Product Type',
        type: 'select',
        options: [
          { value: 'goods', label: 'Goods (storable)' },
          { value: 'consumable', label: 'Consumable' },
          { value: 'service', label: 'Service' },
        ],
        default: 'goods',
      },
      {
        name: 'categoryId',
        label: 'Product Category',
        type: 'relation',
        relation: 'product-categories',
      },
      { name: 'uomId', label: 'Unit of Measure', type: 'relation', relation: 'uoms', required: true },
      {
        name: 'purchaseUomId',
        label: 'Purchase UoM',
        type: 'relation',
        relation: 'uoms',
      },
      { name: 'salesPrice', label: 'Sales Price', type: 'number', default: 0 },
      { name: 'costPrice', label: 'Cost Price', type: 'number', default: 0 },
      {
        name: 'salesTaxIds',
        label: 'Sales Taxes',
        type: 'multiselect-relation',
        relation: 'taxes',
      },
      {
        name: 'purchaseTaxIds',
        label: 'Purchase Taxes',
        type: 'multiselect-relation',
        relation: 'taxes',
      },
      { name: 'canBeSold', label: 'Can be Sold', type: 'boolean', default: true },
      { name: 'canBePurchased', label: 'Can be Purchased', type: 'boolean', default: true },
      { name: 'weight', label: 'Weight', type: 'number' },
      { name: 'volume', label: 'Volume', type: 'number' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
  },

  partners: {
    key: 'partners',
    endpoint: '/partners',
    title: 'Partners & Contacts',
    singular: 'Partner',
    icon: '👥',
    primaryField: 'name',
    secondaryField: 'email',
    fields: null, // filled in below
  },

  customers: {
    key: 'customers',
    endpoint: '/partners',
    defaultParams: { isCustomer: true },
    defaultValues: { isCustomer: true, isVendor: false, companyType: 'company', companyStructure: 'pvt_ltd' },
    title: 'Customers',
    singular: 'Customer',
    icon: '🧑‍💼',
    primaryField: 'name',
    secondaryField: 'email',
    fields: null, // filled in below (shared with vendors)
  },

  vendors: {
    key: 'vendors',
    endpoint: '/partners',
    defaultParams: { isVendor: true },
    defaultValues: { isCustomer: false, isVendor: true, companyType: 'company', companyStructure: 'pvt_ltd' },
    title: 'Vendors',
    singular: 'Vendor',
    icon: '🚚',
    primaryField: 'name',
    secondaryField: 'email',
    fields: null,
  },

  warehouses: {
    key: 'warehouses',
    endpoint: '/warehouses',
    title: 'Warehouses',
    singular: 'Warehouse',
    icon: '🏬',
    primaryField: 'name',
    secondaryField: 'code',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text', required: true, placeholder: 'e.g. WH1' },
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'city', label: 'City', type: 'text' },
      { name: 'country', label: 'Country', type: 'text' },
      { name: 'phone', label: 'Phone', type: 'text' },
    ],
  },

  locations: {
    key: 'locations',
    endpoint: '/locations',
    title: 'Locations',
    singular: 'Location',
    icon: '📍',
    primaryField: 'name',
    secondaryField: 'completeName',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'parentId', label: 'Parent Location', type: 'relation', relation: 'locations' },
      { name: 'warehouseId', label: 'Warehouse', type: 'relation', relation: 'warehouses' },
      {
        name: 'usage',
        label: 'Usage',
        type: 'select',
        options: [
          { value: 'view', label: 'View (organizational)' },
          { value: 'internal', label: 'Internal' },
          { value: 'customer', label: 'Customer' },
          { value: 'vendor', label: 'Vendor' },
          { value: 'inventory', label: 'Inventory adjustment' },
          { value: 'transit', label: 'Transit' },
          { value: 'production', label: 'Production' },
        ],
        default: 'internal',
      },
      { name: 'barcode', label: 'Barcode', type: 'text' },
    ],
  },

  taxes: {
    key: 'taxes',
    endpoint: '/taxes',
    title: 'Taxes',
    singular: 'Tax',
    icon: '🧾',
    primaryField: 'name',
    secondaryField: 'amount',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'code', label: 'Code', type: 'text' },
      {
        name: 'amountType',
        label: 'Amount Type',
        type: 'select',
        options: [
          { value: 'percent', label: 'Percentage' },
          { value: 'fixed', label: 'Fixed amount' },
          { value: 'group', label: 'Group of taxes' },
        ],
        default: 'percent',
      },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      {
        name: 'typeTaxUse',
        label: 'Applies To',
        type: 'select',
        options: [
          { value: 'sale', label: 'Sales' },
          { value: 'purchase', label: 'Purchases' },
          { value: 'none', label: 'None' },
        ],
        default: 'sale',
      },
      { name: 'priceIncluded', label: 'Included in Price', type: 'boolean', default: false },
      { name: 'sequence', label: 'Sequence', type: 'number', default: 10 },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
  },

  'payment-terms': {
    key: 'payment-terms',
    endpoint: '/payment-terms',
    title: 'Payment Terms',
    singular: 'Payment Term',
    icon: '💳',
    primaryField: 'name',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'note', label: 'Note', type: 'textarea' },
      {
        name: 'lines',
        label: 'Installments',
        type: 'array',
        itemLabel: 'Installment',
        default: [],
        itemFields: [
          {
            name: 'valueType',
            label: 'Type',
            type: 'select',
            options: [
              { value: 'percent', label: 'Percent' },
              { value: 'fixed', label: 'Fixed amount' },
              { value: 'balance', label: 'Balance (remainder)' },
            ],
            default: 'balance',
          },
          { name: 'value', label: 'Value (% or amount)', type: 'number', default: 0 },
          { name: 'daysDue', label: 'Days Due', type: 'number', default: 0 },
          { name: 'endOfMonth', label: 'End of Month', type: 'boolean', default: false },
          { name: 'sequence', label: 'Sequence', type: 'number', default: 10 },
        ],
      },
    ],
  },

  pricelists: {
    key: 'pricelists',
    endpoint: '/pricelists',
    title: 'Pricelists',
    singular: 'Pricelist',
    icon: '💲',
    primaryField: 'name',
    secondaryField: 'currency',
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'currency', label: 'Currency', type: 'text', default: 'USD' },
      {
        name: 'items',
        label: 'Pricing Rules',
        type: 'array',
        itemLabel: 'Rule',
        default: [],
        itemFields: [
          {
            name: 'appliedOn',
            label: 'Applies On',
            type: 'select',
            options: [
              { value: 'all_products', label: 'All Products' },
              { value: 'category', label: 'Product Category' },
              { value: 'product', label: 'Specific Product' },
            ],
            default: 'all_products',
          },
          { name: 'productId', label: 'Product (if specific)', type: 'relation', relation: 'products' },
          {
            name: 'categoryId',
            label: 'Category (if category rule)',
            type: 'relation',
            relation: 'product-categories',
          },
          {
            name: 'computeType',
            label: 'Compute Type',
            type: 'select',
            options: [
              { value: 'fixed', label: 'Fixed Price' },
              { value: 'percentage', label: 'Percentage (+/- off sales price)' },
              { value: 'formula', label: 'Formula (markup on cost)' },
            ],
            default: 'fixed',
          },
          { name: 'fixedPrice', label: 'Fixed Price', type: 'number' },
          { name: 'percentage', label: 'Percentage', type: 'number' },
          { name: 'minQuantity', label: 'Min. Quantity', type: 'number', default: 0 },
          { name: 'dateStart', label: 'Start Date', type: 'date' },
          { name: 'dateEnd', label: 'End Date', type: 'date' },
          { name: 'sequence', label: 'Sequence', type: 'number', default: 10 },
        ],
      },
    ],
  },

  users: {
    key: 'users',
    endpoint: '/users',
    title: 'Users',
    singular: 'User',
    icon: '👤',
    primaryField: 'name',
    secondaryField: 'email',
    fields: [
      { name: 'name', label: 'Full Name', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'text', required: true },
      {
        name: 'password',
        label: 'Password',
        type: 'password',
        required: true,
        createOnly: true, // hidden when editing
      },
      { name: 'phone', label: 'Phone', type: 'text' },
    ],
  },
  divisions: {
    key: 'divisions',
    endpoint: '/divisions',
    title: 'Divisions',
    singular: 'Division',
    icon: '🏢',
    primaryField: 'name',
    secondaryField: 'code',
    fields: [
      { name: 'name', label: 'Division Name', type: 'text', required: true },
      { name: 'code', label: 'Division Code', type: 'text', placeholder: 'e.g. Filt' },
      { name: 'active', label: 'Active', type: 'boolean', default: true },
    ],
  },

  'account-types': {
    key: 'account-types',
    endpoint: '/account-types',
    title: 'Account Types',
    singular: 'Account Type',
    icon: '🏷️',
    primaryField: 'name',
    secondaryField: 'type',
    fields: [
      { name: 'name', label: 'Type Name', type: 'text', required: true, placeholder: 'e.g. Asset, Liability, Income, Expense, Receivable' },
      {
        name: 'internalGroup',
        label: 'Primary Head (Internal Group)',
        type: 'select',
        required: true,
        options: [
          { value: 'asset', label: 'Asset (Primary)' },
          { value: 'liability', label: 'Liability (Primary)' },
          { value: 'income', label: 'Income (Primary)' },
          { value: 'expense', label: 'Expense (Primary)' },
          { value: 'equity', label: 'Equity' },
          { value: 'off_balance', label: 'Off-Balance Sheet' },
        ],
        default: 'asset',
      },
      {
        name: 'type',
        label: 'Type Category',
        type: 'select',
        required: true,
        options: [
          { value: 'regular', label: 'Regular' },
          { value: 'receivable', label: 'Receivable' },
          { value: 'payable', label: 'Payable' },
          { value: 'liquidity', label: 'Liquidity' },
        ],
        default: 'regular',
      },
      {
        name: 'includeInitialBalance',
        label: 'Include Initial Balance',
        type: 'boolean',
        default: true,
      },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional description or notes' },
    ],
  },

  'account-groups': {
    key: 'account-groups',
    endpoint: '/account-groups',
    title: 'Account Groups',
    singular: 'Account Group',
    icon: '🗂️',
    primaryField: 'name',
    secondaryField: 'codePrefix',
    fields: [
      { name: 'name', label: 'Group Name', type: 'text', required: true, placeholder: 'e.g. Current Assets, Current Liabilities' },
      { name: 'codePrefix', label: 'Code Prefix', type: 'text', required: true, placeholder: 'e.g. 10, 11, 20' },
      {
        name: 'accountTypeId',
        label: 'Account Type',
        type: 'relation',
        relation: 'account-types',
      },
      {
        name: 'parentId',
        label: 'Parent Group',
        type: 'relation',
        relation: 'account-groups',
      },
    ],
  },

  'account-accounts': {
    key: 'account-accounts',
    endpoint: '/account-accounts',
    title: 'Chart of Accounts',
    singular: 'Account',
    icon: '📚',
    primaryField: 'name',
    secondaryField: 'code',
    fields: [
      { name: 'code', label: 'Account Code', type: 'text', required: true, placeholder: 'e.g. 101000' },
      { name: 'name', label: 'Account Name', type: 'text', required: true, placeholder: 'e.g. Bank Current Account' },
      {
        name: 'accountTypeId',
        label: 'Account Type',
        type: 'relation',
        relation: 'account-types',
        required: true,
      },
      {
        name: 'groupId',
        label: 'Account Group',
        type: 'relation',
        relation: 'account-groups',
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'text',
        default: 'INR',
        placeholder: 'e.g. INR, USD',
      },
      {
        name: 'reconcile',
        label: 'Allow Reconciliation',
        type: 'boolean',
        default: false,
        description: 'Allow matching of journal entries (e.g. bills vs payments)',
      },
    ],
  },

  'account-journals': {
    key: 'account-journals',
    endpoint: '/account-journals',
    title: 'Accounting Journals',
    singular: 'Journal',
    icon: '📒',
    primaryField: 'name',
    secondaryField: 'code',
    fields: [
      { name: 'name', label: 'Journal Name', type: 'text', required: true, placeholder: 'e.g. Customer Invoices, Vendor Bills, Bank' },
      { name: 'code', label: 'Short Code', type: 'text', required: true, placeholder: 'e.g. INV, BILL, BNK, CSH' },
      {
        name: 'type',
        label: 'Journal Type',
        type: 'select',
        required: true,
        options: [
          { value: 'purchase', label: 'Purchase' },
          { value: 'sale', label: 'Sales' },
          { value: 'bank', label: 'Bank' },
          { value: 'cash', label: 'Cash' },
          { value: 'general', label: 'Miscellaneous' },
        ],
        default: 'general',
      },
    ],
  },

  'bank-accounts': {
    key: 'bank-accounts',
    endpoint: '/bank-accounts',
    title: 'Bank Accounts',
    singular: 'Bank Account',
    icon: '🏦',
    primaryField: 'name',
    secondaryField: 'accountNumber',
    fields: [
      {
        name: 'name',
        label: 'Bank Account Name',
        type: 'text',
        required: true,
        placeholder: 'e.g. HDFC Bank Current Account',
      },
      {
        name: 'bankName',
        label: 'Bank Name',
        type: 'text',
        placeholder: 'e.g. HDFC Bank, State Bank of India',
      },
      {
        name: 'accountNumber',
        label: 'Account Number',
        type: 'text',
        required: true,
        placeholder: 'e.g. 50200012345678',
      },
      {
        name: 'shortCode',
        label: 'Bank Short Code',
        type: 'text',
        required: true,
        placeholder: 'e.g. HDFC, BNK1',
      },
      {
        name: 'receivable',
        label: 'Receivable',
        type: 'boolean',
        default: true,
        description: 'Manual tick: Enable for incoming customer receipts',
      },
      {
        name: 'payable',
        label: 'Payable',
        type: 'boolean',
        default: true,
        description: 'Manual tick: Enable for outgoing vendor bill payments',
      },
      {
        name: 'currency',
        label: 'Currency',
        type: 'text',
        default: 'INR',
        placeholder: 'e.g. INR, USD',
      },
    ],
  },
};

// Aliases for singular keys so getEntity('account-account') always works
ENTITIES['account-account'] = ENTITIES['account-accounts'];
ENTITIES['account-group'] = ENTITIES['account-groups'];
ENTITIES['account-type'] = ENTITIES['account-types'];
ENTITIES['account-journal'] = ENTITIES['account-journals'];
ENTITIES['bank-account'] = ENTITIES['bank-accounts'];
ENTITIES['partner'] = ENTITIES['partners'];
ENTITIES['customer'] = ENTITIES['customers'];
ENTITIES['vendor'] = ENTITIES['vendors'];

// Partners, Customers & Vendors share the same comprehensive partner field-set.
const PARTNER_FIELDS = [
  // 1. Identification & Type
  {
    name: 'name',
    label: 'Partner / Company Name',
    type: 'text',
    required: true,
    placeholder: 'e.g. Acme Corp or John Doe',
  },
  {
    name: 'companyType',
    label: 'Company Type',
    type: 'select',
    required: true,
    options: [
      { value: 'company', label: 'Company' },
      { value: 'individual', label: 'Individual' },
    ],
    default: 'company',
  },
  {
    name: 'companyStructure',
    label: 'Company Structure / Legal Type',
    type: 'select',
    options: [
      { value: 'pvt_ltd', label: 'Private Limited (Pvt Ltd)' },
      { value: 'public_ltd', label: 'Public Limited (Public Ltd)' },
      { value: 'llc', label: 'Limited Liability Company (LLC)' },
      { value: 'proprietorship', label: 'Sole Proprietorship (Prop)' },
      { value: 'partnership', label: 'Partnership Firm' },
      { value: 'other', label: 'Other' },
    ],
    default: 'pvt_ltd',
  },
  {
    name: 'parentId',
    label: 'Company',
    type: 'relation',
    relation: 'customers',
    params: { companyType: 'company', strict: true },
    placeholder: 'Select company for this individual...',
    description: 'Select the company this individual contact belongs to',
  },
  {
    name: 'isCustomer',
    label: 'Is a Customer',
    type: 'boolean',
    default: false,
    description: 'Check if this partner purchases products/services',
  },
  {
    name: 'isVendor',
    label: 'Is a Vendor',
    type: 'boolean',
    default: false,
    description: 'Check if this partner supplies goods/services',
  },

  // 2. Tax & Compliance (GSTIN & PAN)
  {
    name: 'hasGstin',
    label: 'GST Registered?',
    type: 'boolean',
    default: false,
    description: 'Toggle if business has GST registration',
  },
  {
    name: 'gstin',
    label: 'GSTIN Number',
    type: 'text',
    placeholder: 'e.g. 27AAAAA0000A1Z5 (15 digits)',
  },
  {
    name: 'hasPan',
    label: 'Has PAN?',
    type: 'boolean',
    default: false,
    description: 'Toggle if PAN is available',
  },
  {
    name: 'pan',
    label: 'PAN Number',
    type: 'text',
    placeholder: 'e.g. ABCDE1234F (10 digits)',
  },

  // 3. Warehouse & Stock Locations
  // {
  //   name: 'warehouseId',
  //   label: 'Default Warehouse',
  //   type: 'relation',
  //   relation: 'warehouses',
  // },
  {
    name: 'customerLocationId',
    label: 'Customer Location (Drop-off)',
    type: 'relation',
    relation: 'locations',
    params: { usage: 'customer' },
  },
  {
    name: 'vendorLocationId',
    label: 'Vendor Location (Source)',
    type: 'relation',
    relation: 'locations',
    params: { usage: 'vendor' },
  },

  // 4. Invoicing & Accounting
  {
    name: 'accountReceivableId',
    label: 'Account Receivable',
    type: 'relation',
    relation: 'account-accounts',
    params: { type: 'receivable' },
  },
  {
    name: 'accountPayableId',
    label: 'Account Payable',
    type: 'relation',
    relation: 'account-accounts',
    params: { type: 'payable' },
  },
  {
    name: 'paymentTermId',
    label: 'Payment Term',
    type: 'relation',
    relation: 'payment-terms',
  },
  {
    name: 'pricelistId',
    label: 'Pricelist',
    type: 'relation',
    relation: 'pricelists',
  },
  {
    name: 'currency',
    label: 'Currency',
    type: 'text',
    default: 'INR',
    placeholder: 'e.g. INR, USD',
  },

  // 5. Contact & Address Details
  {
    name: 'email',
    label: 'Email',
    type: 'text',
    placeholder: 'e.g. contact@example.com',
  },
  {
    name: 'phone',
    label: 'Phone',
    type: 'text',
    placeholder: 'e.g. +91 9876543210',
  },
  {
    name: 'mobile',
    label: 'Mobile',
    type: 'text',
    placeholder: 'e.g. +91 9876543211',
  },
  {
    name: 'website',
    label: 'Website',
    type: 'text',
    placeholder: 'e.g. https://www.example.com',
  },
  { name: 'street', label: 'Street', type: 'text' },
  { name: 'street2', label: 'Street 2', type: 'text' },
  { name: 'city', label: 'City', type: 'text' },
  { name: 'state', label: 'State', type: 'text' },
  { name: 'zip', label: 'PIN / Postal Code', type: 'text' },
  { name: 'country', label: 'Country', type: 'text', default: 'India' },
  { name: 'notes', label: 'Internal Notes', type: 'textarea' },
];

ENTITIES.partners.fields = PARTNER_FIELDS;
ENTITIES.customers.fields = PARTNER_FIELDS;
ENTITIES.vendors.fields = PARTNER_FIELDS;

/** Modules shown on the Inventory hub screen, in display order. */
export const INVENTORY_MENU = [
  'products',
  'product-categories',
  'uoms',
  'uom-categories',
  'warehouses',
  'locations',
];

/** Modules shown on the Accounting hub screen, in display order. */
export const ACCOUNTING_MENU = [
  'bank-accounts',
  'account-accounts',
  'account-groups',
  'account-types',
  'taxes',
  'payment-terms',
  'pricelists'
];

/** Modules shown on the Settings hub screen, in display order. */
export const SETTINGS_MENU = [
  {
    // title: 'Invoicing & Accounting Master Data',
    // data: [
    //   'bank-accounts',
    //   'account-types',
    //   'account-groups',
    //   'account-accounts',
    //   'account-journals',
    // ],
  },
  {
    title: 'Organization & Structure',
    data: ['divisions'],
  },
  {
    title: 'Business Partners',
    data: ['customers', 'vendors'],
  },
  // {
  //   title: 'Financial Settings',
  //   data: ['taxes', 'payment-terms', 'pricelists'],
  // },
  {
    title: 'Users & Access',
    data: ['users'],
  },
];

export const getEntity = key => {
  if (!key) return null;
  if (ENTITIES[key]) return ENTITIES[key];
  const lower = String(key).toLowerCase().trim();
  if (ENTITIES[lower]) return ENTITIES[lower];
  if (lower.endsWith('s') && ENTITIES[lower.slice(0, -1)]) return ENTITIES[lower.slice(0, -1)];
  if (!lower.endsWith('s') && ENTITIES[`${lower}s`]) return ENTITIES[`${lower}s`];
  return null;
};


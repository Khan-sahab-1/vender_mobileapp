import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import StateBadge from '../../components/StateBadge';
import PickerModal from '../../components/PickerModal';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { customerInvoicesApi } from '../../api/sales';
import { accountingApi } from '../../api/purchase';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';
import { formatDate } from '../../utils/dateUtils';

function parseSafeDate(d) {
  if (!d) return new Date();
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatWarehouseDeliverTo(wh) {
  if (!wh) return '';
  const code = wh.code ? ` (${wh.code}: Outgoing)` : ': Outgoing';
  return `${wh.name || 'Warehouse'}${code}`;
}

function formatWarehouseAddress(wh) {
  if (!wh) return '';
  const parts = [wh.address, wh.city, wh.country].filter(Boolean);
  return parts.join(', ') || '';
}

export default function CustomerInvoiceDetailScreen({ route, navigation }) {
  const initialInvoice = route?.params?.invoice || route?.params?.bill;
  const invoiceId = route?.params?.invoiceId || route?.params?.billId || initialInvoice?.id;

  const [bill, setBill] = useState(initialInvoice || null);
  const [loading, setLoading] = useState(!initialInvoice);
  const [activeTab, setActiveTab] = useState('lines'); // 'lines' | 'other_info'
  const [actionLoading, setActionLoading] = useState(false);

  // Form State (Structured form card UI matching Vendor Bill)
  const [editForm, setEditForm] = useState(() => {
    if (!initialInvoice) {
      return {
        invoiceNumber: '',
        deliverTo: '',
        deliveryAddress: '',
        receiptDate: new Date().toISOString().slice(0, 10),
        billDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
        sourceDocument: '',
        notes: '',
        customerId: null,
        customerName: '',
        divisionId: null,
        divisionName: '',
        warehouseId: null,
        warehouseName: '',
        lines: [],
      };
    }
    const defaultDeliverTo = initialInvoice.deliveryAddress || initialInvoice.deliverTo || formatWarehouseDeliverTo(initialInvoice.warehouse);
    const defaultDeliveryAddress = initialInvoice.deliveryAddress || formatWarehouseAddress(initialInvoice.warehouse);
    return {
      invoiceNumber: initialInvoice.invoiceNumber || '',
      deliverTo: defaultDeliverTo,
      deliveryAddress: defaultDeliveryAddress,
      receiptDate: initialInvoice.invoiceDate
        ? String(initialInvoice.invoiceDate).slice(0, 10)
        : (initialInvoice.createdAt ? String(initialInvoice.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)),
      billDate: initialInvoice.invoiceDate
        ? String(initialInvoice.invoiceDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      dueDate: initialInvoice.dueDate ? String(initialInvoice.dueDate).slice(0, 10) : '',
      sourceDocument: initialInvoice.sourceDocument || '',
      notes: initialInvoice.notes || '',
      customerId: initialInvoice.customerId || initialInvoice.customer?.id,
      customerName: initialInvoice.customerName || initialInvoice.customer?.name || '',
      divisionId: initialInvoice.divisionId || initialInvoice.division?.id,
      divisionName: initialInvoice.division?.name || (initialInvoice.division?.code ? `${initialInvoice.division.name} (${initialInvoice.division.code})` : ''),
      warehouseId: initialInvoice.warehouseId || initialInvoice.warehouse?.id,
      warehouseName: initialInvoice.warehouse?.name || '',
      lines: (initialInvoice.lines || []).map((l, index) => ({
        id: l.id || 'line-' + index,
        productId: l.productId || l.product?.id,
        description: l.description || l.product?.name || 'Product Item',
        quantity: Number(l.quantity || 1),
        unitPrice: Number(l.unitPrice || 0),
        taxId: l.taxId,
        taxAmount: Number(l.taxAmount || 0),
        subtotal: Number(l.subtotal || (Number(l.quantity || 1) * Number(l.unitPrice || 0))),
      })),
    };
  });

  const populateFormFromInvoice = useCallback((b) => {
    if (!b) return;
    const defaultDeliverTo = b.deliveryAddress || b.deliverTo || formatWarehouseDeliverTo(b.warehouse);
    const defaultDeliveryAddress = b.deliveryAddress || formatWarehouseAddress(b.warehouse);
    setEditForm({
      invoiceNumber: b.invoiceNumber || '',
      deliverTo: defaultDeliverTo,
      deliveryAddress: defaultDeliveryAddress,
      receiptDate: b.invoiceDate
        ? String(b.invoiceDate).slice(0, 10)
        : (b.createdAt ? String(b.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)),
      billDate: b.invoiceDate
        ? String(b.invoiceDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      dueDate: b.dueDate ? String(b.dueDate).slice(0, 10) : '',
      sourceDocument: b.sourceDocument || '',
      notes: b.notes || '',
      customerId: b.customerId || b.customer?.id,
      customerName: b.customerName || b.customer?.name || '',
      divisionId: b.divisionId || b.division?.id,
      divisionName: b.division?.name || (b.division?.code ? `${b.division.name} (${b.division.code})` : ''),
      warehouseId: b.warehouseId || b.warehouse?.id,
      warehouseName: b.warehouse?.name || '',
      lines: (b.lines || []).map((l, index) => ({
        id: l.id || 'line-' + index,
        productId: l.productId || l.product?.id,
        description: l.description || l.product?.name || 'Product Item',
        quantity: Number(l.quantity || 1),
        unitPrice: Number(l.unitPrice || 0),
        taxId: l.taxId,
        taxAmount: Number(l.taxAmount || 0),
        subtotal: Number(l.subtotal || (Number(l.quantity || 1) * Number(l.unitPrice || 0))),
      })),
    });
  }, []);

  // Date Picker State
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [activeDateField, setActiveDateField] = useState('billDate');

  // Generic Picker Modal (Customer / Warehouse / Division)
  const [pickerModal, setPickerModal] = useState({
    visible: false,
    title: '',
    relation: null,
    field: null,
  });

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReference, setPaymentReference] = useState('UTR-' + Date.now().toString().slice(-6));
  const [journals, setJournals] = useState([]);
  const [selectedJournal, setSelectedJournal] = useState(null);

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const res = await customerInvoicesApi.getById(invoiceId);
      if (res) {
        setBill(res);
        populateFormFromInvoice(res);
        setPaymentAmount(String(res.residualAmount ?? res.amountTotal ?? 0));
      }
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  }, [invoiceId, populateFormFromInvoice]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Load Journals for Payment Modal
  useEffect(() => {
    accountingApi
      .getJournals({ limit: 20 })
      .then(res => {
        const items = res?.items || res?.data || [];
        const bankCash = items.filter(j => j.type === 'bank' || j.type === 'cash');
        setJournals(bankCash.length > 0 ? bankCash : items);
        if (bankCash.length > 0) {
          setSelectedJournal(bankCash[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Line editing handlers
  const handleUpdateLine = (index, key, val) => {
    setEditForm(prev => {
      const nextLines = [...prev.lines];
      const target = { ...nextLines[index] };

      if (key === 'quantity') {
        const q = parseFloat(val) || 0;
        target.quantity = val;
        target.subtotal = Number((q * (parseFloat(target.unitPrice) || 0)).toFixed(2));
      } else if (key === 'unitPrice') {
        const p = parseFloat(val) || 0;
        target.unitPrice = val;
        target.subtotal = Number(((parseFloat(target.quantity) || 0) * p).toFixed(2));
      } else {
        target[key] = val;
      }

      nextLines[index] = target;
      return { ...prev, lines: nextLines };
    });
  };

  const handleAddLine = () => {
    setEditForm(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        {
          id: 'temp-' + Date.now(),
          productId: null,
          description: 'New Product / Service Line',
          quantity: 1,
          unitPrice: 0,
          taxId: null,
          taxAmount: 0,
          subtotal: 0,
        },
      ],
    }));
  };

  const handleRemoveLine = index => {
    setEditForm(prev => {
      const nextLines = prev.lines.filter((_, i) => i !== index);
      return { ...prev, lines: nextLines };
    });
  };

  // Date Picker trigger
  const showDatePicker = field => {
    setActiveDateField(field);
    setDatePickerVisibility(true);
  };

  const handleConfirmDate = date => {
    const formatted = date.toISOString().split('T')[0];
    setEditForm(prev => ({ ...prev, [activeDateField]: formatted }));
    setDatePickerVisibility(false);
  };

  // Generic Picker Select
  const handleSelectPicker = item => {
    if (pickerModal.field === 'customer') {
      setEditForm(prev => ({
        ...prev,
        customerId: item.id,
        customerName: item.name,
      }));
    } else if (pickerModal.field === 'warehouse') {
      const deliverTo = formatWarehouseDeliverTo(item);
      const deliveryAddress = formatWarehouseAddress(item);
      setEditForm(prev => ({
        ...prev,
        warehouseId: item.id,
        warehouseName: item.name,
        deliverTo: deliverTo || prev.deliverTo,
        deliveryAddress: deliveryAddress || prev.deliveryAddress,
      }));
    } else if (pickerModal.field === 'division') {
      setEditForm(prev => ({
        ...prev,
        divisionId: item.id,
        divisionName: item.name || item.code || '',
      }));
    }
    setPickerModal(p => ({ ...p, visible: false }));
  };

  // Save Edits (PATCH /customer-invoices/:id)
  const handleSaveEdits = async () => {
    if (!editForm.lines || editForm.lines.length === 0) {
      Alert.alert('Validation Error', 'A customer invoice must have at least one product line.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        customerId: editForm.customerId,
        customerName: editForm.customerName,
        deliveryAddress: editForm.deliveryAddress?.trim() || undefined,
        divisionId: editForm.divisionId || undefined,
        warehouseId: editForm.warehouseId || undefined,
        invoiceDate: editForm.billDate ? new Date(editForm.billDate).toISOString() : undefined,
        dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
        sourceDocument: editForm.sourceDocument,
        notes: editForm.notes,
        lines: editForm.lines.map(l => ({
          productId: l.productId,
          description: l.description,
          quantity: Number(l.quantity || 1),
          unitPrice: Number(l.unitPrice || 0),
          taxId: l.taxId,
          taxAmount: Number(l.taxAmount || 0),
        })),
      };

      const updated = await customerInvoicesApi.update(bill.id, payload);
      setBill(updated);
      populateFormFromInvoice(updated);
      Alert.alert('Bill Saved', 'Customer bill details and lines have been saved successfully.');
      fetchInvoice();
    } catch (err) {
      Alert.alert('Save Failed', err?.response?.data?.message || 'Failed to update customer invoice');
    } finally {
      setActionLoading(false);
    }
  };

  // Action 1: Validate Bill (action_invoice_open)
  const handleValidateBill = async () => {
    if (!bill?.id) return;
    Alert.alert(
      'Validate Customer Bill',
      `Validate ${bill.invoiceNumber || 'Draft Bill'}? This will assign the official Invoice Number and post a balanced Double-Entry Journal Entry (Dr Accounts Receivable, Cr Sales Revenue, Cr Output Tax) to the General Ledger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Validate (Post to Ledger)',
          onPress: async () => {
            setActionLoading(true);
            try {
              if (bill.state === 'draft' && editForm.lines?.length > 0) {
                const payload = {
                  customerId: editForm.customerId,
                  customerName: editForm.customerName,
                  deliveryAddress: editForm.deliveryAddress?.trim() || undefined,
                  divisionId: editForm.divisionId || undefined,
                  warehouseId: editForm.warehouseId || undefined,
                  invoiceDate: editForm.billDate ? new Date(editForm.billDate).toISOString() : undefined,
                  dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
                  sourceDocument: editForm.sourceDocument,
                  notes: editForm.notes,
                  lines: editForm.lines.map(l => ({
                    productId: l.productId,
                    description: l.description,
                    quantity: Number(l.quantity || 1),
                    unitPrice: Number(l.unitPrice || 0),
                    taxId: l.taxId,
                    taxAmount: Number(l.taxAmount || 0),
                  })),
                };
                await customerInvoicesApi.update(bill.id, payload).catch(() => {});
              }

              const updated = await customerInvoicesApi.validate(bill.id);
              setBill(updated);
              populateFormFromInvoice(updated);
              Alert.alert(
                'Bill Validated!',
                `Official Invoice ${updated.invoiceNumber || ''} generated and posted to Ledger Voucher!`,
              );
              fetchInvoice();
            } catch (err) {
              Alert.alert(
                'Validation Error',
                err?.response?.data?.message || err?.message || 'Failed to validate customer invoice',
              );
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  // Action 2: Confirm Payment
  const handleConfirmPayment = async () => {
    if (!selectedJournal?.id) {
      Alert.alert('Validation Error', 'Please select a Payment Journal.');
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount.');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await customerInvoicesApi.registerPayment(bill.id, {
        journalId: selectedJournal.id,
        amount: amt,
        paymentDate: new Date().toISOString(),
        paymentMethod: selectedJournal.type === 'bank' ? 'bank' : 'cash',
        reference: paymentReference.trim() || undefined,
        communication: `Receipt for ${bill.invoiceNumber || 'Bill'}`,
      });

      setPaymentModalOpen(false);
      setBill(updated);
      populateFormFromInvoice(updated);
      Alert.alert(
        'Payment Recorded!',
        `Receipt of ₹${amt.toFixed(2)} recorded successfully against ${updated.invoiceNumber || 'Invoice'}.`,
      );
      fetchInvoice();
    } catch (err) {
      Alert.alert(
        'Payment Error',
        err?.response?.data?.message || err?.message || 'Failed to record customer payment',
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Customer Bill...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!bill) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <Text style={typography.h3}>Customer Bill Not Found</Text>
          <TouchableOpacity
            style={[styles.btnSave, { marginTop: spacing.md, paddingHorizontal: 20 }]}
            onPress={() => navigation.goBack()}>
            <Text style={styles.btnSaveText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const billState = bill.state?.toLowerCase() || 'draft';
  const isReadOnly = billState !== 'draft';
  const residualAmt = Number(bill.residualAmount ?? bill.amountTotal ?? 0);

  const operationTypeDisplay = bill.warehouse?.name
    ? `${bill.warehouse.name}: Outgoing Delivery`
    : 'Warehouse Delivery / Dispatch';

  // Real-time calculated totals
  const editUntaxed = editForm.lines.reduce(
    (s, l) => s + (Number(l.quantity || 0) * Number(l.unitPrice || 0)),
    0,
  );
  const editTax = editForm.lines.reduce(
    (s, l) => s + Number(l.taxAmount || 0),
    0,
  );
  const editTotal = editUntaxed + editTax;

  return (
    <ScreenContainer>
      {/* Top Header Card (Always Structured Odoo Form UI - Matching Vendor Bill) */}
      <View style={[styles.headerCard, shadows.sm]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.billNumber}>{bill.invoiceNumber || 'Draft Bill'}</Text>
            <TouchableOpacity
              style={styles.vendorPickerTrigger}
              disabled={isReadOnly}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Customer',
                  relation: 'customers',
                  field: 'customer',
                })
              }>
              <Text style={styles.vendorPickerText}>
                👤 {editForm.customerName || bill.customerName || bill.customer?.name || 'Select Customer (Tap to choose)'}
              </Text>
              {!isReadOnly && <Text style={styles.editPencil}>✏️</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <StateBadge state={billState} />
          </View>
        </View>

        {/* Action Command Bar */}
        <View style={styles.actionsBar}>
          {billState === 'draft' && (
            <View style={styles.draftActionsRow}>
              <TouchableOpacity
                style={styles.btnSave}
                activeOpacity={0.8}
                disabled={actionLoading}
                onPress={handleSaveEdits}>
                <Text style={styles.btnSaveText}>
                  {actionLoading ? 'Saving...' : '💾 Save Changes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnValidate}
                activeOpacity={0.8}
                disabled={actionLoading}
                onPress={handleValidateBill}>
                <Text style={styles.btnValidateText}>
                  {actionLoading ? 'Validating...' : '✓ Validate Bill'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {(billState === 'open' || billState === 'posted') && (
            <View style={styles.validatedActionsRow}>
              <TouchableOpacity
                style={styles.btnPayment}
                activeOpacity={0.8}
                disabled={actionLoading}
                onPress={() => setPaymentModalOpen(true)}>
                <Text style={styles.btnPaymentText}>💳 Register Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnVoucher}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate(navigationScreen.VOUCHER, {
                    bill,
                    move: bill.accountMove,
                    moveId: bill.accountMoveId,
                  })
                }>
                <Text style={styles.btnVoucherText}>📑 Voucher</Text>
              </TouchableOpacity>
            </View>
          )}

          {billState === 'paid' && (
            <View style={{ gap: spacing.xs }}>
              <View style={styles.paidBadgeBanner}>
                <Text style={styles.paidBadgeBannerText}>
                  ✓ Reconciled & Fully Paid (Residual: {bill.currency || 'INR'} 0.00)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.btnVoucherPaid}
                activeOpacity={0.8}
                onPress={() =>
                  navigation.navigate(navigationScreen.VOUCHER, {
                    bill,
                    move: bill.accountMove,
                    moveId: bill.accountMoveId,
                  })
                }>
                <Text style={styles.btnVoucherPaidText}>📑 View Voucher</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Header Details Fields (Structured Form Box) */}
        <View style={styles.editHeaderFields}>
          {/* Row 1: Invoice Number / SO Ref & Division */}
          <View style={styles.editRow}>
            {/* Invoice Number */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>
                Invoice Number <Text style={{ color: colors.danger, fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                style={styles.editInput}
                editable={false}
                value={bill.invoiceNumber || 'Auto on Validate'}
                placeholder="Auto on Validate"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Division */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Division</Text>
              <TouchableOpacity
                style={styles.editDateField}
                disabled={isReadOnly}
                onPress={() =>
                  setPickerModal({
                    visible: true,
                    title: 'Select Division',
                    relation: 'divisions',
                    field: 'division',
                  })
                }>
                <Text style={styles.editDateFieldText} numberOfLines={1}>
                  🏭 {editForm.divisionName || bill.division?.name || 'Select Division'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Receipt / Invoice Date & Due Date */}
          <View style={styles.editRow}>
            {/* Bill Date */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Bill Date</Text>
              <TouchableOpacity
                style={styles.editDateField}
                disabled={isReadOnly}
                onPress={() => showDatePicker('billDate')}>
                <Text style={styles.editDateFieldText}>
                  📅 {formatDate(editForm.billDate) || 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Due Date */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Due Date</Text>
              <TouchableOpacity
                style={styles.editDateField}
                disabled={isReadOnly}
                onPress={() => showDatePicker('dueDate')}>
                <Text style={styles.editDateFieldText}>
                  📅 {formatDate(editForm.dueDate) || 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 3: Deliver To & Warehouse */}
          <View style={styles.editRow}>
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Deliver To Warehouse</Text>
              <TouchableOpacity
                style={styles.editDateField}
                disabled={isReadOnly}
                onPress={() =>
                  setPickerModal({
                    visible: true,
                    title: 'Select Warehouse',
                    relation: 'warehouses',
                    field: 'warehouse',
                  })
                }>
                <Text style={styles.editDateFieldText} numberOfLines={1}>
                  📦 {editForm.deliverTo || editForm.warehouseName || bill.warehouse?.name || 'Select Warehouse'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Source Document */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Source SO / Ref</Text>
              <TextInput
                style={styles.editInput}
                editable={!isReadOnly}
                value={editForm.sourceDocument}
                onChangeText={v => setEditForm(p => ({ ...p, sourceDocument: v }))}
                placeholder="SO reference"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Row 4: Delivery Address */}
          <View style={{ marginBottom: spacing.xs }}>
            <Text style={styles.editFieldLabel}>Delivery Address</Text>
            <TextInput
              style={[styles.editInput, { minHeight: 44 }]}
              editable={!isReadOnly}
              multiline
              value={editForm.deliveryAddress}
              onChangeText={v => setEditForm(p => ({ ...p, deliveryAddress: v }))}
              placeholder="Delivery destination address..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Row 5: Notes */}
          <View style={[styles.editRow, { marginBottom: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.editFieldLabel}>Notes / Terms</Text>
              <TextInput
                style={styles.editInput}
                editable={!isReadOnly}
                value={editForm.notes}
                onChangeText={v => setEditForm(p => ({ ...p, notes: v }))}
                placeholder="Internal notes or payment terms..."
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>
        </View>

        {/* Customer Address */}
        {Boolean(bill.customerAddress && bill.customerAddress !== 'No address provided') && (
          <View style={styles.headerAddressBox}>
            <Text style={styles.headerAddressLabel}>📍 Customer Address:</Text>
            <Text style={styles.headerAddressText} numberOfLines={2}>
              {bill.customerAddress}
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBarScroll}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'lines' && styles.tabItemActive]}
            onPress={() => setActiveTab('lines')}>
            <Text style={[styles.tabText, activeTab === 'lines' && styles.tabTextActive]}>
              Invoice Lines ({editForm.lines?.length || 0})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'other_info' && styles.tabItemActive]}
            onPress={() => setActiveTab('other_info')}>
            <Text style={[styles.tabText, activeTab === 'other_info' && styles.tabTextActive]}>
              Other Info
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* ============================================================== */}
        {/* TAB 1: INVOICE PRODUCT LINES (Structured Line Cards)           */}
        {/* ============================================================== */}
        {activeTab === 'lines' && (
          <View style={styles.tabContent}>
            <View style={[styles.card, shadows.sm]}>
              <View style={styles.tableTitleRow}>
                <Text style={styles.cardHeaderTitle}>
                  INVOICE PRODUCT LINES ({editForm.lines?.length || 0})
                </Text>
                <Text style={styles.tableTitleSub}>
                  {isReadOnly
                    ? 'Products billed for this sales order'
                    : 'Modify quantities, prices, or add items below'}
                </Text>
              </View>

              <View>
                {(!editForm.lines || editForm.lines.length === 0) ? (
                  <View style={styles.emptyLinesBox}>
                    <Text style={styles.emptyLinesText}>No product lines found on this bill.</Text>
                  </View>
                ) : (
                  editForm.lines.map((l, idx) => {
                    const qty = parseFloat(l.quantity) || 0;
                    const price = parseFloat(l.unitPrice) || 0;
                    const sub = Number((qty * price).toFixed(2));

                    return (
                      <View key={l.id || idx} style={styles.editLineCard}>
                        <View style={styles.editLineHeader}>
                          <Text style={styles.editLineIndex}>Line #{idx + 1}</Text>
                          {!isReadOnly && (
                            <TouchableOpacity
                              onPress={() => handleRemoveLine(idx)}
                              style={styles.btnRemoveLine}>
                              <Text style={styles.btnRemoveLineText}>🗑️ Remove</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {/* Description */}
                        <Text style={styles.editLabelSmall}>Product / Description</Text>
                        <TextInput
                          style={styles.editInputLine}
                          editable={!isReadOnly}
                          value={l.description}
                          onChangeText={v => handleUpdateLine(idx, 'description', v)}
                          placeholder="Item description"
                          placeholderTextColor={colors.textMuted}
                        />

                        {/* Qty, Unit Price, Subtotal */}
                        <View style={styles.editLineNumbersRow}>
                          <View style={styles.editNumberCol}>
                            <Text style={styles.editLabelSmall}>Quantity</Text>
                            <TextInput
                              style={styles.editInputLine}
                              editable={!isReadOnly}
                              keyboardType="numeric"
                              value={String(l.quantity)}
                              onChangeText={v => handleUpdateLine(idx, 'quantity', v)}
                            />
                          </View>

                          <View style={styles.editNumberCol}>
                            <Text style={styles.editLabelSmall}>
                              Unit Price ({bill.currency || 'INR'})
                            </Text>
                            <TextInput
                              style={styles.editInputLine}
                              editable={!isReadOnly}
                              keyboardType="numeric"
                              value={String(l.unitPrice)}
                              onChangeText={v => handleUpdateLine(idx, 'unitPrice', v)}
                            />
                          </View>

                          <View style={styles.editNumberCol}>
                            <Text style={styles.editLabelSmall}>Subtotal</Text>
                            <View style={styles.editSubtotalBox}>
                              <Text style={styles.editSubtotalText}>
                                ₹{sub.toFixed(2)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}

                {!isReadOnly && (
                  <TouchableOpacity
                    style={styles.btnAddLine}
                    activeOpacity={0.8}
                    onPress={handleAddLine}>
                    <Text style={styles.btnAddLineText}>+ Add a Product Line</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Financial Totals */}
              <View style={styles.totalsSection}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Untaxed Amount:</Text>
                  <Text style={styles.totalsVal}>
                    {bill.currency || 'INR'} {editUntaxed.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Taxes (GST):</Text>
                  <Text style={styles.totalsVal}>
                    {bill.currency || 'INR'} {editTax.toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.totalsRow, styles.totalsRowGrand]}>
                  <Text style={styles.grandLabel}>Total Bill Amount:</Text>
                  <Text style={styles.grandVal}>
                    {bill.currency || 'INR'} {editTotal.toFixed(2)}
                  </Text>
                </View>
                {billState !== 'draft' && (
                  <View style={styles.totalsRow}>
                    <Text style={styles.residualLabel}>Amount Due (Residual):</Text>
                    <Text
                      style={[
                        styles.residualVal,
                        residualAmt > 0 ? styles.residualDue : styles.residualZero,
                      ]}>
                      {bill.currency || 'INR'} {residualAmt.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ============================================================== */}
        {/* TAB 2: OTHER INFO (Operation Type & Partner Account)           */}
        {/* ============================================================== */}
        {activeTab === 'other_info' && (
          <View style={styles.tabContent}>
            {/* 1. Accounting Operation Card */}
            <View style={[styles.card, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>ACCOUNTING & OPERATION INFORMATION</Text>

              {/* Account Operation Type */}
              <View style={styles.otherInfoRow}>
                <View style={styles.otherInfoLeft}>
                  <Text style={styles.otherInfoLabel}>Operation Type</Text>
                  <Text style={styles.otherInfoSub}>Warehouse outgoing delivery operation</Text>
                </View>
                <View style={styles.opTypeBadge}>
                  <Text style={styles.opTypeBadgeText}>{operationTypeDisplay}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Partner Account */}
              <View style={[styles.otherInfoBox, styles.partnerAccountHighlight]}>
                <View style={styles.otherInfoRowNoMargin}>
                  <Text style={styles.partnerAccountTitle}>
                    Partner Account (Used for this Invoice)
                  </Text>
                  <View style={styles.receivableBadge}>
                    <Text style={styles.receivableBadgeText}>Receivable Asset</Text>
                  </View>
                </View>
                <Text style={styles.partnerAccountDetail}>
                  105001 · Customer Ledger (Sundry Debtors)
                </Text>
                <Text style={styles.partnerAccountSub}>
                  When validated, this account is debited to increase customer balance. When payment is registered, it is credited.
                </Text>
              </View>
            </View>

            {/* 2. Additional Sales Details */}
            <View style={[styles.card, shadows.sm, { marginTop: spacing.md }]}>
              <Text style={styles.cardHeaderTitle}>ADDITIONAL SALES DETAILS</Text>

              {Boolean(bill.invoiceNumber || editForm.invoiceNumber) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Invoice Number</Text>
                  <Text style={[styles.procureVal, { fontWeight: '700', color: colors.primary }]}>
                    {bill.invoiceNumber || editForm.invoiceNumber}
                  </Text>
                </View>
              )}

              {Boolean(bill.deliveryAddress || editForm.deliveryAddress) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Delivery Address</Text>
                  <Text style={styles.procureVal}>
                    {bill.deliveryAddress || editForm.deliveryAddress}
                  </Text>
                </View>
              )}

              {Boolean(bill.division?.name || editForm.divisionName) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Division</Text>
                  <Text style={styles.procureVal}>
                    🏭 {bill.division?.name || editForm.divisionName}
                  </Text>
                </View>
              )}

              {Boolean(bill.invoiceDate) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Bill Date</Text>
                  <Text style={styles.procureVal}>{formatDate(bill.invoiceDate)}</Text>
                </View>
              )}

              {Boolean(bill.dueDate) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Due Date</Text>
                  <Text style={styles.procureVal}>{formatDate(bill.dueDate)}</Text>
                </View>
              )}

              {Boolean(bill.sourceDocument) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Source Document</Text>
                  <Text style={styles.procureVal}>{bill.sourceDocument}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* REGISTER PAYMENT MODAL (Receipt) */}
      <Modal
        visible={paymentModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, shadows.md]}>
            <Text style={styles.modalTitle}>Register Customer Payment</Text>
            <Text style={styles.modalSub}>
              Bill #{bill.invoiceNumber || 'Draft'} • Total Due: ₹{residualAmt.toFixed(2)}
            </Text>

            {/* Select Journal */}
            <Text style={styles.modalFieldLabel}>Payment Journal *</Text>
            <View style={styles.journalPickerRow}>
              {journals.map(j => {
                const isSel = selectedJournal?.id === j.id;
                return (
                  <TouchableOpacity
                    key={j.id}
                    style={[styles.journalPill, isSel && styles.journalPillActive]}
                    onPress={() => setSelectedJournal(j)}>
                    <Text style={[styles.journalPillText, isSel && styles.journalPillTextActive]}>
                      {j.code} · {j.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Amount */}
            <Text style={styles.modalFieldLabel}>Payment Amount (₹) *</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />

            {/* Reference */}
            <Text style={styles.modalFieldLabel}>Payment Reference / Memo</Text>
            <TextInput
              style={styles.modalInput}
              value={paymentReference}
              onChangeText={setPaymentReference}
              placeholder="Cheque # or UTR number"
            />

            {/* Modal Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setPaymentModalOpen(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalBtnConfirm}
                disabled={actionLoading}
                onPress={handleConfirmPayment}>
                <Text style={styles.modalBtnConfirmText}>
                  {actionLoading ? 'Processing...' : 'Confirm & Reconcile ✓'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RELATION PICKER MODAL (Customer / Warehouse / Division) */}
      <PickerModal
        visible={pickerModal.visible}
        title={pickerModal.title}
        relation={pickerModal.relation}
        onClose={() => setPickerModal(p => ({ ...p, visible: false }))}
        onSelect={handleSelectPicker}
      />

      {/* DATE PICKER MODAL */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={parseSafeDate(editForm[activeDateField])}
        onConfirm={handleConfirmDate}
        onCancel={() => setDatePickerVisibility(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.bodyBold,
    color: colors.textMuted,
  },
  headerCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  billNumber: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '800',
  },
  vendorPickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 4,
  },
  vendorPickerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
    flex: 1,
  },
  editPencil: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionsBar: {
    marginTop: 8,
    marginBottom: 4,
  },
  draftActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnSave: {
    flex: 1,
    backgroundColor: '#16A34A',
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnValidate: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  btnValidateText: {
    color: colors.textInverted,
    fontSize: 13,
    fontWeight: '700',
  },
  validatedActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  btnPayment: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPaymentText: {
    color: colors.textInverted,
    fontSize: 13,
    fontWeight: '700',
  },
  btnVoucher: {
    flex: 1,
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnVoucherText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnVoucherPaid: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  btnVoucherPaidText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  paidBadgeBanner: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  paidBadgeBannerText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  editHeaderFields: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  editFieldCol: {
    flex: 1,
  },
  editFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 3,
  },
  editInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.text,
  },
  editDateField: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  editDateFieldText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  headerAddressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.xs,
    padding: spacing.xs + 2,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerAddressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  headerAddressText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 2,
  },
  tabBarContainer: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBarScroll: {
    flexDirection: 'row',
  },
  tabItem: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  tabContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  tableTitleRow: {
    marginBottom: spacing.sm,
  },
  tableTitleSub: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyLinesBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyLinesText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  editLineCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.xs,
    padding: spacing.sm,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editLineIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  btnRemoveLine: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  btnRemoveLineText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '700',
  },
  editLabelSmall: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
    marginTop: 4,
  },
  editInputLine: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: colors.text,
  },
  editLineNumbersRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  editNumberCol: {
    flex: 1,
  },
  editSubtotalBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'flex-end',
  },
  editSubtotalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  btnAddLine: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: radius.xs,
    paddingVertical: 9,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  btnAddLineText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  totalsSection: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalsRowGrand: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 2,
  },
  totalsLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalsVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  grandLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  grandVal: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '800',
  },
  residualLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textMuted,
  },
  residualVal: {
    ...typography.bodyBold,
  },
  residualDue: {
    color: '#C2410C',
  },
  residualZero: {
    color: '#15803D',
  },
  otherInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  otherInfoRowNoMargin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  otherInfoLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  otherInfoLabel: {
    ...typography.bodyBold,
    color: colors.text,
  },
  otherInfoSub: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  opTypeBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  opTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  otherInfoBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.xs,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  partnerAccountHighlight: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  partnerAccountTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: '#166534',
  },
  partnerAccountDetail: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  partnerAccountSub: {
    ...typography.tiny,
    color: '#475569',
    marginTop: 2,
  },
  receivableBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
  },
  receivableBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  procureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSubtle,
  },
  procureLabel: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
  procureVal: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  modalSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  modalFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    marginTop: spacing.xs,
  },
  journalPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  journalPill: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.xs,
  },
  journalPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  journalPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  journalPillTextActive: {
    color: colors.textInverted,
  },
  modalInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalBtnCancelText: {
    ...typography.bodyBold,
    color: colors.textSecondary,
  },
  modalBtnConfirm: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    ...typography.bodyBold,
    color: colors.textInverted,
  },
});

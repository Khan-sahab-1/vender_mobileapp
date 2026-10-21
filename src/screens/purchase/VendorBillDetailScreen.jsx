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
import { vendorBillsApi, accountingApi } from '../../api/purchase';
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
  const code = wh.code ? ` (${wh.code}: Receipts)` : ': Receipts';
  return `${wh.name || 'Warehouse'}${code}`;
}

function formatWarehouseAddress(wh) {
  if (!wh) return '';
  const parts = [wh.address, wh.city, wh.country].filter(Boolean);
  return parts.join(', ') || '';
}

export default function VendorBillDetailScreen({ route, navigation }) {
  const initialBill = route?.params?.bill;
  const billId = route?.params?.billId || initialBill?.id;

  const [bill, setBill] = useState(initialBill || null);
  const [loading, setLoading] = useState(!initialBill);
  const [activeTab, setActiveTab] = useState('lines'); // 'lines' | 'other_info' | 'journal_items' | 'partner_ledger'
  const [actionLoading, setActionLoading] = useState(false);

  // Form State (Always displayed in structured form card UI)
  const [editForm, setEditForm] = useState(() => {
    if (!initialBill) {
      return {
        invoiceNumber: '',
        deliverTo: '',
        deliveryAddress: '',
        receiptDate: new Date().toISOString().slice(0, 10),
        billDate: new Date().toISOString().slice(0, 10),
        dueDate: '',
        sourceDocument: '',
        notes: '',
        vendorId: null,
        vendorName: '',
        divisionId: null,
        divisionName: '',
        warehouseId: null,
        warehouseName: '',
        lines: [],
      };
    }
    const defaultDeliverTo = initialBill.deliverTo || formatWarehouseDeliverTo(initialBill.warehouse);
    const defaultDeliveryAddress = initialBill.deliveryAddress || formatWarehouseAddress(initialBill.warehouse);
    return {
      invoiceNumber: initialBill.invoiceNumber || '',
      deliverTo: defaultDeliverTo,
      deliveryAddress: defaultDeliveryAddress,
      receiptDate: initialBill.receiptDate
        ? String(initialBill.receiptDate).slice(0, 10)
        : (initialBill.createdAt ? String(initialBill.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)),
      billDate: initialBill.invoiceDate
        ? String(initialBill.invoiceDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      dueDate: initialBill.dueDate ? String(initialBill.dueDate).slice(0, 10) : '',
      sourceDocument: initialBill.sourceDocument || '',
      notes: initialBill.notes || '',
      vendorId: initialBill.vendorId || initialBill.vendor?.id,
      vendorName: initialBill.vendorName || initialBill.vendor?.name || '',
      divisionId: initialBill.divisionId || initialBill.division?.id,
      divisionName: initialBill.division?.name || (initialBill.division?.code ? `${initialBill.division.name} (${initialBill.division.code})` : ''),
      warehouseId: initialBill.warehouseId || initialBill.warehouse?.id,
      warehouseName: initialBill.warehouse?.name || '',
      lines: (initialBill.lines || []).map((l, index) => ({
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

  const populateFormFromBill = useCallback((b) => {
    if (!b) return;
    const defaultDeliverTo = b.deliverTo || formatWarehouseDeliverTo(b.warehouse);
    const defaultDeliveryAddress = b.deliveryAddress || formatWarehouseAddress(b.warehouse);
    setEditForm({
      invoiceNumber: b.invoiceNumber || '',
      deliverTo: defaultDeliverTo,
      deliveryAddress: defaultDeliveryAddress,
      receiptDate: b.receiptDate
        ? String(b.receiptDate).slice(0, 10)
        : (b.createdAt ? String(b.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)),
      billDate: b.invoiceDate
        ? String(b.invoiceDate).slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      dueDate: b.dueDate ? String(b.dueDate).slice(0, 10) : '',
      sourceDocument: b.sourceDocument || '',
      notes: b.notes || '',
      vendorId: b.vendorId || b.vendor?.id,
      vendorName: b.vendorName || b.vendor?.name || '',
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
  const [activeDateField, setActiveDateField] = useState('receiptDate');

  // Generic Picker Modal (Vendor / Warehouse)
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

  // Partner Ledger State
  const [partnerLedger, setPartnerLedger] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(false);

  const fetchBill = useCallback(async () => {
    if (!billId) return;
    try {
      const res = await vendorBillsApi.get(billId);
      if (res) {
        setBill(res);
        populateFormFromBill(res);
        setPaymentAmount(String(res.residualAmount ?? res.amountTotal ?? 0));
      }
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  }, [billId, populateFormFromBill]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

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

  // Fetch Partner Ledger when user clicks the Partner Ledger tab
  const fetchPartnerLedger = useCallback(async () => {
    if (!bill?.vendorId) return;
    setLoadingLedger(true);
    try {
      const res = await accountingApi.getPartnerLedger(bill.vendorId);
      setPartnerLedger(res);
    } catch {
      // fallback
    } finally {
      setLoadingLedger(false);
    }
  }, [bill?.vendorId]);

  useEffect(() => {
    if (activeTab === 'partner_ledger' && !partnerLedger) {
      fetchPartnerLedger();
    }
  }, [activeTab, partnerLedger, fetchPartnerLedger]);

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
    if (pickerModal.field === 'vendor') {
      setEditForm(prev => ({
        ...prev,
        vendorId: item.id,
        vendorName: item.name,
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

  // Save Edits (PATCH /vendor-bills/:id)
  const handleSaveEdits = async () => {
    if (!editForm.lines || editForm.lines.length === 0) {
      Alert.alert('Validation Error', 'A vendor bill must have at least one product line.');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        vendorId: editForm.vendorId,
        vendorName: editForm.vendorName,
        invoiceNumber: editForm.invoiceNumber?.trim() || undefined,
        deliverTo: editForm.deliverTo?.trim() || undefined,
        deliveryAddress: editForm.deliveryAddress?.trim() || undefined,
        receiptDate: editForm.receiptDate ? new Date(editForm.receiptDate).toISOString() : undefined,
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

      const updated = await vendorBillsApi.update(bill.id, payload);
      setBill(updated);
      populateFormFromBill(updated);
      Alert.alert('Bill Saved', 'Vendor bill details and lines have been saved successfully.');
      fetchBill();
    } catch (err) {
      Alert.alert('Save Failed', err?.response?.data?.message || 'Failed to update vendor bill');
    } finally {
      setActionLoading(false);
    }
  };

  // Action 1: Validate Bill (action_invoice_open)
  const handleValidateBill = async () => {
    if (!bill?.id) return;
    Alert.alert(
      'Validate Vendor Bill',
      `Validate ${bill.billNumber || 'Draft Bill'}? This will assign the official Bill Number and post a balanced Double-Entry Journal Entry (Dr Expense, Cr Accounts Payable) to the General Ledger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Validate (Post to Ledger)',
          onPress: async () => {
            setActionLoading(true);
            try {
              // Ensure any modifications in draft are saved first
              if (bill.state === 'draft' && editForm.lines?.length > 0) {
                const payload = {
                  vendorId: editForm.vendorId,
                  vendorName: editForm.vendorName,
                  invoiceNumber: editForm.invoiceNumber?.trim() || undefined,
                  deliverTo: editForm.deliverTo?.trim() || undefined,
                  deliveryAddress: editForm.deliveryAddress?.trim() || undefined,
                  receiptDate: editForm.receiptDate ? new Date(editForm.receiptDate).toISOString() : undefined,
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
                await vendorBillsApi.update(bill.id, payload);
              }

              const res = await vendorBillsApi.validate(bill.id);
              setBill(res);
              populateFormFromBill(res);
              Alert.alert(
                'Bill Validated!',
                `Bill ${res.billNumber || bill.billNumber || ''} has been validated!\n\nJournal Entry posted to General Ledger.\nVendor Payable balance has been updated.`
              );
              fetchBill();
            } catch (err) {
              Alert.alert('Error', err?.response?.data?.message || 'Failed to validate bill');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // Action 2: Register Payment
  const handleConfirmPayment = async () => {
    if (!selectedJournal) {
      Alert.alert('Validation Error', 'Please select a Payment Journal (Bank or Cash).');
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid payment amount.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await vendorBillsApi.registerPayment(bill.id, {
        journalId: selectedJournal.id,
        amount: amt,
        paymentDate: new Date().toISOString(),
        reference: paymentReference,
      });

      setPaymentModalOpen(false);
      setBill(res);
      Alert.alert(
        'Payment Registered!',
        `Payment of ${bill.currency || 'INR'} ${amt.toFixed(2)} registered successfully via ${selectedJournal.name}!\n\nBill status is now PAID and reconciled.`
      );
      fetchBill();
      fetchPartnerLedger();
    } catch (err) {
      Alert.alert('Payment Error', err?.response?.data?.message || 'Failed to register payment');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !bill) {
    return (
      <ScreenContainer>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading Vendor Bill & Ledger...</Text>
        </View>
      </ScreenContainer>
    );
  }

  const billState = bill.state || 'draft';
  const isReadOnly = billState !== 'draft';
  const residualAmt = Number(bill.residualAmount ?? bill.amountTotal ?? 0);
  const moveLines = bill.accountMove?.lines || [];

  // Partner Payable Account (The ONLY account shown in Other Info)
  const payableLine = moveLines.find(
    ml => ml.account?.type === 'payable' || ml.account?.code === '211000' || Number(ml.credit) > 0,
  );

  const partnerAccountName = bill.vendor?.accountPayable?.code
    ? `${bill.vendor.accountPayable.code} · ${bill.vendor.accountPayable.name}`
    : payableLine?.account
    ? `${payableLine.account.code} · ${payableLine.account.name}`
    : '211000 · Accounts Payable (Sundry Creditors)';

  // Operation Type: Format as WarehouseCode: Receipts (e.g. WH1: Receipts)
  const operationTypeDisplay = bill.warehouse?.code
    ? `${bill.warehouse.code}: Receipts`
    : bill.warehouse?.name
    ? `${bill.warehouse.name}: Receipts`
    : 'WH: Receipts';

  const journalName = bill.journal?.name
    ? `${bill.journal.name} (${bill.journal.code || 'BILL'})`
    : 'Vendor Bills (BILL)';

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
      {/* Top Header Card (Always Structured Odoo Form UI - No Stepper) */}
      <View style={[styles.headerCard, shadows.sm]}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1, paddingRight: spacing.sm }}>
            <Text style={styles.billNumber}>{bill.billNumber || 'Draft Bill'}</Text>
            <TouchableOpacity
              style={styles.vendorPickerTrigger}
              disabled={isReadOnly}
              onPress={() =>
                setPickerModal({
                  visible: true,
                  title: 'Select Vendor',
                  relation: 'partners',
                  field: 'vendor',
                })
              }>
              <Text style={styles.vendorPickerText}>
                👤 {editForm.vendorName || bill.vendorName || bill.vendor?.name || 'Select Vendor (Tap to choose)'}
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

        {/* Header Details Fields (Always Structured Form Box) */}
        <View style={styles.editHeaderFields}>
          {/* Row 1: Invoice Number * & Division */}
          <View style={styles.editRow}>
            {/* Invoice Number (Supplier Ref) */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>
                Invoice Number <Text style={{ color: colors.danger, fontWeight: '900' }}>*</Text>
              </Text>
              <TextInput
                style={styles.editInput}
                editable={!isReadOnly}
                value={editForm.invoiceNumber}
                onChangeText={v => setEditForm(p => ({ ...p, invoiceNumber: v }))}
                placeholder="e.g. INV/2026/0129"
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

          {/* Row 2: Receipt Date & Bill Date */}
          <View style={styles.editRow}>
            {/* Receipt Date */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Receipt Date</Text>
              <TouchableOpacity
                style={styles.editDateField}
                disabled={isReadOnly}
                onPress={() => showDatePicker('receiptDate')}>
                <Text style={styles.editDateFieldText}>
                  📅 {formatDate(editForm.receiptDate) || 'Select Date'}
                </Text>
              </TouchableOpacity>
            </View>

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
          </View>

          {/* Row 3: Deliver To & Due Date */}
          <View style={styles.editRow}>
            {/* Deliver To */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Deliver To</Text>
              <TouchableOpacity
                style={styles.editDateField}
                disabled={isReadOnly}
                onPress={() =>
                  setPickerModal({
                    visible: true,
                    title: 'Select Destination Warehouse',
                    relation: 'warehouses',
                    field: 'warehouse',
                  })
                }>
                <Text style={styles.editDateFieldText} numberOfLines={1}>
                  📦 {editForm.deliverTo || editForm.warehouseName || bill.warehouse?.name || 'Select Destination'}
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

          {/* Row 4: Delivery Address (e.g. WH street, city, country) */}
          <View style={{ marginBottom: spacing.xs }}>
            <Text style={styles.editFieldLabel}>Delivery Address</Text>
            <TextInput
              style={[styles.editInput, { minHeight: 44 }]}
              editable={!isReadOnly}
              multiline
              value={editForm.deliveryAddress}
              onChangeText={v => setEditForm(p => ({ ...p, deliveryAddress: v }))}
              placeholder="Delivery destination address (e.g. warehouse address)..."
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Row 5: Source PO & Notes */}
          <View style={[styles.editRow, { marginBottom: 0 }]}>
            {/* Source Document */}
            <View style={styles.editFieldCol}>
              <Text style={styles.editFieldLabel}>Source PO / Ref</Text>
              <TextInput
                style={styles.editInput}
                editable={!isReadOnly}
                value={editForm.sourceDocument}
                onChangeText={v => setEditForm(p => ({ ...p, sourceDocument: v }))}
                placeholder="PO reference"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            {/* Internal Notes */}
            <View style={styles.editFieldCol}>
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

        {/* Vendor Address (ONLY if present & valid) */}
        {Boolean(bill.vendorAddress && bill.vendorAddress !== 'No address provided') && (
          <View style={styles.headerAddressBox}>
            <Text style={styles.headerAddressLabel}>📍 Vendor Address:</Text>
            <Text style={styles.headerAddressText} numberOfLines={2}>
              {bill.vendorAddress}
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
        {/* TAB 1: INVOICE PRODUCT LINES (Always Structured Line Cards)    */}
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
                    ? 'Products billed for this procurement'
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
        {/* TAB 2: OTHER INFO (Operation Type & Partner Account ONLY)       */}
        {/* ============================================================== */}
        {activeTab === 'other_info' && (
          <View style={styles.tabContent}>
            {/* 1. Accounting Operation Card */}
            <View style={[styles.card, shadows.sm]}>
              <Text style={styles.cardHeaderTitle}>ACCOUNTING & OPERATION INFORMATION</Text>
              
              {/* Account Operation Type: Warehouse Code/Name: Receipts */}
              <View style={styles.otherInfoRow}>
                <View style={styles.otherInfoLeft}>
                  <Text style={styles.otherInfoLabel}>Operation Type</Text>
                  <Text style={styles.otherInfoSub}>Warehouse procurement receipt operation</Text>
                </View>
                <View style={styles.opTypeBadge}>
                  <Text style={styles.opTypeBadgeText}>{operationTypeDisplay}</Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* Partner Account (Used for this invoice) - ONLY 1 Account Shown! */}
              <View style={[styles.otherInfoBox, styles.partnerAccountHighlight]}>
                <View style={styles.otherInfoRowNoMargin}>
                  <Text style={styles.partnerAccountTitle}>
                    Partner Account (Used for this Invoice)
                  </Text>
                  <View style={styles.payableBadge}>
                    <Text style={styles.payableBadgeText}>Payable Liability</Text>
                  </View>
                </View>
                <Text style={styles.partnerAccountCodeName}>{partnerAccountName}</Text>
                <Text style={styles.partnerAccountDesc}>
                  Account representing the outstanding credit liability owed to{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {bill.vendorName || bill.vendor?.name || 'this vendor'}
                  </Text>{' '}
                  for this invoice.
                </Text>
              </View>

              <View style={styles.cardDivider} />

              {/* Journal */}
              <View style={styles.otherInfoRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.otherInfoLabel}>Accounting Journal</Text>
                  <Text style={styles.otherInfoValBold}>{journalName}</Text>
                  <Text style={styles.otherInfoSub}>Purchase Journal for recording vendor liabilities</Text>
                </View>
                <View style={styles.journalBadge}>
                  <Text style={styles.journalBadgeText}>Purchase</Text>
                </View>
              </View>

              {/* Journal Entry # if posted */}
              {Boolean(bill.accountMove?.name || bill.accountMoveId) && (
                <>
                  <View style={styles.cardDivider} />
                  <TouchableOpacity
                    style={styles.otherInfoRow}
                    activeOpacity={0.7}
                    onPress={() =>
                      navigation.navigate(navigationScreen.VOUCHER, {
                        bill,
                        moveId: bill.accountMoveId,
                        move: bill.accountMove,
                      })
                    }>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.otherInfoLabel}>General Ledger Entry (Voucher)</Text>
                      <Text style={[styles.otherInfoValBold, { color: colors.primary }]}>
                        📑 {bill.accountMove?.name || 'Posted Accounting Voucher'}
                      </Text>
                      <Text style={styles.otherInfoSub}>Tap to view accounting voucher</Text>
                    </View>
                    <View style={styles.postedBadge}>
                      <Text style={styles.postedBadgeText}>View Voucher →</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* 2. Additional Procurement Details */}
            <View style={[styles.card, shadows.sm, { marginTop: spacing.md }]}>
              <Text style={styles.cardHeaderTitle}>ADDITIONAL PROCUREMENT DETAILS</Text>

              {Boolean(bill.invoiceNumber || editForm.invoiceNumber) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Invoice Number</Text>
                  <Text style={[styles.procureVal, { fontWeight: '700', color: colors.primary }]}>
                    {bill.invoiceNumber || editForm.invoiceNumber}
                  </Text>
                </View>
              )}

              {Boolean(bill.receiptDate || editForm.receiptDate) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Receipt Date</Text>
                  <Text style={styles.procureVal}>
                    {formatDate(bill.receiptDate || editForm.receiptDate)}
                  </Text>
                </View>
              )}

              {Boolean(bill.deliverTo || editForm.deliverTo) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Deliver To</Text>
                  <Text style={[styles.procureVal, { fontWeight: '700' }]}>
                    📦 {bill.deliverTo || editForm.deliverTo}
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

              {Boolean(bill.vendor?.paymentTerm?.name) && (
                <View style={styles.procureRow}>
                  <Text style={styles.procureLabel}>Payment Terms</Text>
                  <Text style={styles.procureVal}>{bill.vendor.paymentTerm.name}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* REGISTER PAYMENT MODAL */}
      <Modal
        visible={paymentModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, shadows.md]}>
            <Text style={styles.modalTitle}>Register Vendor Payment</Text>
            <Text style={styles.modalSub}>
              Bill #{bill.billNumber} • Total Due: ₹{residualAmt.toFixed(2)}
            </Text>

            {/* Select Journal (Bank or Cash) */}
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

      {/* RELATION PICKER MODAL (Vendor / Warehouse) */}
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
  headerAddressBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.xs,
    padding: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  headerAddressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  headerAddressText: {
    fontSize: 11,
    color: colors.text,
    marginTop: 2,
    lineHeight: 15,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  tabContent: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeaderTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  tableTitleRow: {
    marginBottom: spacing.sm,
  },
  tableTitleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  editLineCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  editLineIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  btnRemoveLine: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  btnRemoveLineText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  editLabelSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
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
    marginTop: 6,
  },
  editNumberCol: {
    flex: 1,
  },
  editSubtotalBox: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editSubtotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  btnAddLine: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderStyle: 'dashed',
    borderRadius: radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  btnAddLineText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A34A',
  },
  emptyLinesBox: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyLinesText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  totalsSection: {
    marginTop: spacing.sm,
    gap: 4,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalsLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  totalsVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  totalsRowGrand: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 4,
  },
  grandLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  grandVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  residualLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  residualVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  residualDue: {
    color: colors.danger,
  },
  residualZero: {
    color: colors.secondary,
  },
  otherInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  otherInfoRowNoMargin: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  otherInfoLeft: {
    flex: 1,
  },
  otherInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  otherInfoValBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 2,
  },
  otherInfoSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  otherInfoBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginVertical: 4,
  },
  partnerAccountHighlight: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  partnerAccountTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  partnerAccountCodeName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E40AF',
    marginVertical: 2,
  },
  partnerAccountDesc: {
    fontSize: 11,
    color: '#3B82F6',
    lineHeight: 15,
  },
  opTypeBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  opTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7E22CE',
  },
  payableBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#93C5FD',
  },
  payableBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1E40AF',
  },
  journalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  journalBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  postedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
  },
  postedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  procureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  procureLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  procureVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  journalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  journalSubTitle: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  balancedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  balancedPillText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyJournalBox: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyJournalEmoji: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyJournalText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptyJournalSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.xs,
  },
  thCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  accNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  reconciledTag: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.secondary,
    marginTop: 2,
  },
  drCrText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  tableFooter: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    marginTop: 4,
  },
  tfCell: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  ledgerSummaryCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: spacing.sm,
  },
  ledgerSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  ledgerSummaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ledgerSummaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  ledgerSummaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  ledgerItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ledgerEntryName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  ledgerDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ledgerDrCr: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 420,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  journalPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  journalPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  journalPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalBtnCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  modalBtnCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modalBtnConfirm: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  modalBtnConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverted,
  },
});

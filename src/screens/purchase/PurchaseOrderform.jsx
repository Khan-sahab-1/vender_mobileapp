import React, { useLayoutEffect, useState, useMemo, useEffect } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ScreenContainer from '../../components/ScreenContainer';
import Button from '../../components/Button';
import PickerModal from '../../components/PickerModal';
import StateBadge from '../../components/StateBadge';
import { purchaseOrdersApi } from '../../api/purchase';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { formatDate } from '../../utils/dateUtils';

function getTodayString() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function getDefaultDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
}

function parseSafeDate(dateStr) {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

function formatVendorAddress(v) {
  if (!v) return 'No address provided';
  if (typeof v.address === 'string' && v.address) return v.address;
  const streetPart = [v.street, v.street2].filter(Boolean).join(', ');
  const cityPart = [v.city, v.state, v.zip].filter(Boolean).join(' ');
  const parts = [streetPart, cityPart, v.country].filter(Boolean).join('\n');
  return parts || 'No address provided';
}

const ORDER_TYPES = [
  { key: 'adhoc', label: 'Adhoc', desc: 'Direct order without prior requisition (Direct Bill flow)' },
  { key: 'direct', label: 'Direct', desc: 'Order based on purchase requisition' },
  { key: 'arc', label: 'ARC', desc: 'Annual Rate Contract' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
];

export default function PurchaseOrderform({ navigation, route }) {
  const initialOrder = route?.params?.order;
  const initialOrderId = route?.params?.orderId || initialOrder?.id;
  // console.log('PurchaseOrderform initialOrderId:', initialOrderId, 'initialOrder:', initialOrder);

  const [currentOrder, setCurrentOrder] = useState(initialOrder || null);
  const isEditing = Boolean(initialOrderId || currentOrder?.id);

  // Form Fields
  const [orderType, setOrderType] = useState(initialOrder?.type || 'adhoc');
  const [vendor, setVendor] = useState(initialOrder?.vendor ? {
    value: initialOrder.vendor.id,
    label: initialOrder.vendor.name,
    address: formatVendorAddress(initialOrder.vendor),
    record: initialOrder.vendor,
  } : null);

  // const [warehouse, setWarehouse] = useState(initialOrder?.warehouse ? {
  //   value: initialOrder.warehouse.id,
  //   label: initialOrder.warehouse.name,
  //   record: initialOrder.warehouse,
  // } : null);
  const [warehouse, setWarehouse] = useState(
  initialOrder?.warehouse
    ? {
        value: initialOrder.warehouse.id,
        label: initialOrder.warehouse.name,
        record: initialOrder.warehouse,
      }
    : null
);

  const [division, setDivision] = useState(initialOrder?.division ? {
    value: initialOrder.division.id,
    label: initialOrder.division.code ? `${initialOrder.division.name} (${initialOrder.division.code})` : initialOrder.division.name,
    record: initialOrder.division,
  } : null);

  const [currency, setCurrency] = useState(initialOrder?.currency || 'INR');
  const [orderDate, setOrderDate] = useState(
    initialOrder?.orderDate ? String(initialOrder.orderDate).slice(0, 10) : getTodayString()
  );
  const [deliveryDate, setDeliveryDate] = useState(
    initialOrder?.deliveryDate ? String(initialOrder.deliveryDate).slice(0, 10) : getDefaultDeliveryDate()
  );
  const [notes, setNotes] = useState(initialOrder?.notes || '');

  // Lines
  const [lines, setLines] = useState(
    initialOrder?.lines && initialOrder.lines.length > 0
      ? initialOrder.lines.map((l, idx) => {
          const rate = l.tax ? (Number(l.tax.amount) || 0) / 100 : 0;
          return {
            id: l.id || `line-${idx}`,
            productId: l.productId,
            productName: l.product?.name || l.name || 'Item',
            quantity: Number(l.quantity || 1),
            unitPrice: Number(l.unitPrice || 0),
            taxId: l.taxId || l.tax?.id || null,
            taxRate: rate,
            taxName: l.tax?.name || (l.tax?.amount ? `${l.tax.amount}%` : null),
          };
        })
      : [
          {
            id: 'line-0',
            productId: null,
            productName: '',
            quantity: 1,
            unitPrice: 0,
            taxId: null,
            taxRate: 0,
            taxName: null,
          },
        ]
  );

  // Pickers & Modals
  const [pickerModal, setPickerModal] = useState({
    visible: false,
    title: '',
    relation: null,
    options: null,
    field: null,
    lineId: null,
    params: null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [activeDateField, setActiveDateField] = useState('orderDate');

  const showDatePicker = (field = 'orderDate') => {
    setActiveDateField(field);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    if (activeDateField === 'orderDate') {
      setOrderDate(formattedDate);
    } else if (activeDateField === 'deliveryDate') {
      setDeliveryDate(formattedDate);
    }
    hideDatePicker();
  };

  // Load PO if we have ID but missing relations
  useEffect(() => {
    if (initialOrderId) {
      purchaseOrdersApi
        .get(initialOrderId)
        .then(res => {
          if (res) {
            setCurrentOrder(res);
            setOrderType(res.type || 'adhoc');
            if (res.vendor) {
              setVendor({
                value: res.vendor.id,
                label: res.vendor.name,
                address: formatVendorAddress(res.vendor),
                record: res.vendor,
              });
            }
            if (res.warehouse) {
              setWarehouse({
                value: res.warehouse.id,
                label: res.warehouse.name,
                record: res.warehouse,
                address: formatVendorAddress(res.warehouse),
                // address: res.warehouse.address || 'No address provided',
              });
            }
            if (res.division) {
              setDivision({
                value: res.division.id,
                label: res.division.code ? `${res.division.name} (${res.division.code})` : res.division.name,
                record: res.division,
              });
            }
            if (res.currency) setCurrency(res.currency);
            if (res.orderDate) setOrderDate(String(res.orderDate).slice(0, 10));
            if (res.deliveryDate) setDeliveryDate(String(res.deliveryDate).slice(0, 10));
            if (res.notes) setNotes(res.notes);
            if (res.lines && res.lines.length > 0) {
              setLines(
                res.lines.map((l, idx) => {
                  const rate = l.tax ? (Number(l.tax.amount) || 0) / 100 : 0;
                  return {
                    id: l.id || `line-${idx}`,
                    productId: l.productId,
                    productName: l.product?.name || l.description || 'Item',
                    quantity: Number(l.quantity || 1),
                    unitPrice: Number(l.unitPrice || 0),
                    taxId: l.taxId || l.tax?.id || null,
                    taxRate: rate,
                    taxName: l.tax?.name || (l.tax?.amount ? `${l.tax.amount}%` : null),
                  };
                })
              );
            }
          }
        })
        .catch(() => {});
    }
  }, [initialOrderId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing
        ? (currentOrder?.name && !currentOrder.name.startsWith('RFQ')
            ? currentOrder.name
            : 'Purchase Order')
        : 'Create  PO',
    });
  }, [navigation, isEditing, currentOrder]);

  // Calculations
  const totals = useMemo(() => {
    let untaxed = 0;
    let tax = 0;
    for (const l of lines) {
      const lineSub = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
      untaxed += lineSub;
      if (l.taxRate) {
        tax += lineSub * Number(l.taxRate);
      }
    }
    const total = untaxed + tax;
    return { untaxed, tax, total };
  }, [lines]);

  const handlePickerSelect = item => {
    if (pickerModal.field === 'vendor') {
      const rec = item.record;
      setVendor({
        value: item.value,
        label: item.label,
        address: formatVendorAddress(rec),
        record: rec,
      });
      if (rec?.currency) setCurrency(rec.currency);
    } else if (pickerModal.field === 'warehouse') {
      const rec = item.record;

      setWarehouse({
        value: item.value,
        label: item.label,
        address: formatVendorAddress(rec),
        record: rec,
      });
    } else if (pickerModal.field === 'division') {
      setDivision(item);
    } else if (pickerModal.field === 'currency') {
      setCurrency(item.value);
    } else if (pickerModal.field === 'product') {
      const rec = item.record;
      const price = Number(rec?.costPrice || rec?.salesPrice || 100);
      setLines(prev =>
        prev.map(l =>
          l.id === pickerModal.lineId
            ? {
                ...l,
                productId: item.value,
                productName: item.label,
                unitPrice: price,
              }
            : l
        )
      );
    } else if (pickerModal.field === 'lineTax') {
      const rec = item.record;
      const amount = Number(rec?.amount) || 0;
      const rate = rec?.amountType === 'percent' || !rec?.amountType ? amount / 100 : 0;
      const taxLabel = rec?.name || `${amount}%`;
      setLines(prev =>
        prev.map(l =>
          l.id === pickerModal.lineId
            ? {
                ...l,
                taxId: item.value,
                taxRate: rate,
                taxName: taxLabel,
              }
            : l
        )
      );
    }
    setPickerModal(p => ({ ...p, visible: false }));
  };

  const handleClearLineTax = lineId => {
    setLines(prev =>
      prev.map(l =>
        l.id === lineId
          ? {
              ...l,
              taxId: null,
              taxRate: 0,
              taxName: null,
            }
          : l
      )
    );
  };

  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        productId: null,
        productName: '',
        quantity: 1,
        unitPrice: 0,
        taxId: null,
        taxRate: 0,
        taxName: null,
      },
    ]);
  };

  const handleRemoveLine = id => {
    if (lines.length <= 1) {
      Alert.alert('Validation', 'A Purchase Order must have at least one line item.');
      return;
    }
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLineQty = (id, delta) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id === id) {
          const qty = Math.max(1, (Number(l.quantity) || 1) + delta);
          return { ...l, quantity: qty };
        }
        return l;
      })
    );
  };

  const handleUpdateLinePrice = (id, val) => {
    const num = parseFloat(val) || 0;
    setLines(prev =>
      prev.map(l => (l.id === id ? { ...l, unitPrice: num } : l))
    );
  };

  // Submit / Save
  const handleSaveDraft = async () => {
    if (!vendor?.value) {
      Alert.alert('Validation Error', 'Please select a Vendor.');
      return;
    }
    if (!warehouse?.value) {
      Alert.alert('Validation Error', 'Please select a Receiving Warehouse.');
      return;
    }
    if (!division?.value) {
      Alert.alert('Validation Error', 'Please select a Division.');
      return;
    }
    const hasEmptyProduct = lines.some(l => !l.productId && !l.productName);
    if (hasEmptyProduct) {
      Alert.alert('Validation Error', 'Please select a Product for each order line.');
      return;
    }

    const payload = {
      type: orderType,
      vendorId: vendor.value,
      warehouseId: warehouse.value,
      divisionId: division.value,
      currency,
      orderDate: new Date(orderDate).toISOString(),
      deliveryDate: new Date(deliveryDate).toISOString(),
      notes,
      lines: lines.map(l => ({
        productId: l.productId || l.id,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxId: l.taxId || undefined,
      })),
    };

    setSubmitting(true);
    try {
      if (currentOrder?.id) {
        const updated = await purchaseOrdersApi.update(currentOrder.id, payload);
        setCurrentOrder(updated);
        Alert.alert(
          'Draft Updated',
          'Purchase Order draft has been updated.\n\nPress "Confirm Order" to generate official PO Number.',
        );
      } else {
        const created = await purchaseOrdersApi.create(payload);
        setCurrentOrder(created);
        Alert.alert(
          'Draft Created!',
          'Purchase Order created successfully as Draft.\n\nOfficial PO Number will be generated when you press "Confirm Order".',
          [
            {
              text: 'OK',
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Order (Generates Official PO Number, stays in draft)
  const handleConfirmOrder = async () => {
    if (!currentOrder?.id) return;
    setActionLoading(true);
    try {
      const updated = await purchaseOrdersApi.confirm(currentOrder.id);
      setCurrentOrder(updated);
      Alert.alert(
        'Order Confirmed!',
        `Official Purchase Order ${updated?.name || ''} generated successfully!\n\nYou can now send it for approval.`,
      );
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to confirm order');
    } finally {
      setActionLoading(false);
    }
  };

  // Send for Approval (transitions state to to_approve)
  const handleSendForApproval = async () => {
    if (!currentOrder?.id) return;
    setActionLoading(true);
    try {
      const updated = await purchaseOrdersApi.sendForApproval(currentOrder.id);
      setCurrentOrder(updated);
      Alert.alert(
        'Sent for Approval!',
        `Purchase Order ${updated?.name || ''} submitted for Manager / Admin approval.`,
      );
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send for approval');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Approve Order -> Direct Vendor Bill & Stock Receipt
  const handleApproveOrder = async () => {
    if (!currentOrder?.id) return;
    setActionLoading(true);
    try {
      const res = await purchaseOrdersApi.approve(currentOrder.id);
      setCurrentOrder(res);
      const bill = res?.vendorBill;
      const picking = res?.stockPicking;
      Alert.alert(
        'PO Approved!',
        `PO ${res.name} approved!\n\n🧾 Vendor Bill: ${bill?.billNumber || 'Draft Bill'}\n📦 Stock Receipt: ${picking?.name || 'Created'}\n\nInventory moves & Accounting entries are ready!`,
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'Open Vendor Bill',
            onPress: () => {
              if (bill) {
                navigation.navigate(navigationScreen.VENDOR_BILL_DETAIL, {
                  bill,
                  billId: bill.id,
                });
              } else {
                navigation.navigate(navigationScreen.VENDORS_BILLS);
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to approve PO');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceiveGoods = async () => {
    if (!currentOrder?.id) return;
    const billState = currentOrder.vendorBill?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    if (!isBillValidated) {
      Alert.alert(
        'Invoice Validation Required',
        `Stock receipt cannot be validated yet!\n\nThe Vendor Bill (${currentOrder.vendorBill?.billNumber || 'Draft'}) must be validated before physical goods can be received into warehouse stock.\n\nWould you like to open and validate the Vendor Bill now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Vendor Bill',
            onPress: () => {
              if (currentOrder.vendorBill) {
                navigation.navigate(navigationScreen.VENDOR_BILL_DETAIL, {
                  bill: currentOrder.vendorBill,
                  billId: currentOrder.vendorBill.id,
                });
              } else {
                navigation.navigate(navigationScreen.VENDORS_BILLS);
              }
            },
          },
        ],
      );
      return;
    }

    setActionLoading(true);
    try {
      const updated = await purchaseOrdersApi.receiveGoods(currentOrder.id);
      setCurrentOrder(updated);
      Alert.alert(
        'Stock Updated!',
        `Goods received for ${updated.name}!\n\nReceipt ${updated?.stockPicking?.name || ''} validated and added to Warehouse on-hand stock.`,
      );
    } catch (err) {
      Alert.alert('Validation Error', err?.response?.data?.message || 'Failed to receive goods');
    } finally {
      setActionLoading(false);
    }
  };

  const currentState =
    currentOrder?.state === 'billed' ? 'approved' : currentOrder?.state || 'draft';
  const billState = currentOrder?.vendorBill?.state?.toLowerCase();
  const isBillValidated =
    billState === 'open' || billState === 'posted' || billState === 'paid';

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* State Banner / Stepper */}
        {isEditing && (
          <View style={[styles.stepperCard, shadows.sm]}>
            <View style={styles.stepperTop}>
              <Text style={styles.stepperTitle}>
                {currentOrder?.name && !currentOrder.name.startsWith('RFQ')
                  ? currentOrder.name
                  : ''}
              </Text>
              <StateBadge state={currentState} />
            </View>

            <View style={styles.stepTrack}>
              <View style={[styles.stepDot, styles.stepActive]}>
                <Text style={styles.stepDotNum}>1</Text>
              </View>
              <Text style={styles.stepLabel}>Draft</Text>

              <View
                style={[
                  styles.stepLine,
                  (currentState === 'to_approve' || currentState === 'approved') &&
                    styles.stepLineActive,
                ]}
              />

              <View
                style={[
                  styles.stepDot,
                  (currentState === 'to_approve' || currentState === 'approved') &&
                    styles.stepActive,
                ]}>
                <Text style={styles.stepDotNum}>2</Text>
              </View>
              <Text style={styles.stepLabel}>To Approve</Text>

              <View
                style={[
                  styles.stepLine,
                  currentState === 'approved' && styles.stepLineActive,
                ]}
              />

              <View
                style={[
                  styles.stepDot,
                  currentState === 'approved' && styles.stepActiveSuccess,
                ]}>
                <Text style={styles.stepDotNum}>✓</Text>
              </View>
              <Text style={styles.stepLabel}>Approved</Text>
            </View>

            {/* Direct Bill Linked Button */}
            {currentOrder?.vendorBill && (
              <TouchableOpacity
                style={styles.linkedBillBtn}
                onPress={() =>
                  navigation.navigate(navigationScreen.VENDOR_BILL_DETAIL, {
                    bill: currentOrder.vendorBill,
                    billId: currentOrder.vendorBill.id,
                  })
                }>
                <Text style={styles.linkedBillBtnText}>
                  🧾 View Generated Vendor Bill: {currentOrder.vendorBill.billNumber || 'Draft Bill'} ›
                </Text>
              </TouchableOpacity>
            )}

            {/* Linked Stock Receipt & Goods Receiving */}
            {currentOrder?.stockPicking && (
              <View style={styles.linkedReceiptBox}>
                <View style={styles.linkedReceiptHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkedReceiptTitle}>
                      📦 Stock Receipt: {currentOrder.stockPicking.name}
                    </Text>
                    <Text style={styles.linkedReceiptSub}>
                      Destination: {currentOrder.warehouse?.name || 'Warehouse Stock'}
                    </Text>
                  </View>
                  <StateBadge state={currentOrder.stockPicking.state} />
                </View>

                {currentOrder.stockPicking.state === 'done' ? (
                  <View style={styles.receiptDoneBanner}>
                    <Text style={styles.receiptDoneBannerText}>
                      ✓ Goods Received & On-Hand Stock Updated
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.btnReceiveGoods,
                      !isBillValidated && styles.btnReceiveGoodsLocked,
                    ]}
                    activeOpacity={0.8}
                    disabled={actionLoading}
                    onPress={handleReceiveGoods}>
                    <Text
                      style={[
                        styles.btnReceiveGoodsText,
                        !isBillValidated && styles.btnReceiveGoodsTextLocked,
                      ]}>
                      {actionLoading
                        ? 'Receiving...'
                        : isBillValidated
                        ? '📦 Receive Goods (Update Warehouse Stock) ✓'
                        : '🔒 Validate Bill First to Receive Stock'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* 1. ORDER TYPE SELECTOR */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardSectionTitle}>PURCHASE ORDER TYPE</Text>
          <View style={styles.typeSegmentRow}>
            {ORDER_TYPES.map(t => {
              const active = orderType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeBtn, active && styles.typeBtnActive]}
                  onPress={() => setOrderType(t.key)}
                  activeOpacity={0.8}>
                  <Text style={[styles.typeText, active && styles.typeTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.typeHelpText}>
            💡 {ORDER_TYPES.find(t => t.key === orderType)?.desc}
          </Text>
        </View>

        {/* 2. CORE DETAILS: Vendor, Warehouse, Division */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardSectionTitle}>PROCUREMENT PARTNERS & LOCATIONS</Text>

          {/* Vendor */}
          <Text style={styles.inputLabel}>Vendor *</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() =>
              setPickerModal({
                visible: true,
                title: 'Select Vendor',
                relation: 'vendors',
                field: 'vendor',
              })
            }>
            <Text style={vendor ? styles.pickerTriggerText : styles.pickerPlaceholder}>
              {vendor ? vendor.label : 'Select Vendor...'}
            </Text>
            <Text style={styles.triggerChevron}>⌄</Text>
          </TouchableOpacity>

          {vendor && (
            <View style={styles.addressBox}>
              <Text style={styles.addressBoxTitle}>Vendor Address:</Text>
              <Text style={styles.addressBoxContent}>{vendor.address}</Text>
            </View>
          )}

          {/* Warehouse */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
            Deliver To *
          </Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() =>
              setPickerModal({
                visible: true,
                title: 'Select Warehouse',
                relation: 'warehouses',
                field: 'warehouse',
              })
            }>
            <Text style={warehouse ? styles.pickerTriggerText : styles.pickerPlaceholder}>
              {warehouse ? warehouse.label : 'Select Warehouse...'}
            </Text>
            <Text style={styles.triggerChevron}>⌄</Text>
          </TouchableOpacity>
          {warehouse && (
            <View style={styles.addressBox}>
              <Text style={styles.addressBoxTitle}>Warehouse Address:</Text>
              <Text style={styles.addressBoxContent}>{warehouse.address}</Text>
            </View>
          )}

          {/* Division */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Division *</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() =>
              setPickerModal({
                visible: true,
                title: 'Select Division',
                relation: 'divisions',
                field: 'division',
              })
            }>
            <Text style={division ? styles.pickerTriggerText : styles.pickerPlaceholder}>
              {division ? division.label : 'Select Division...'}
            </Text>
            <Text style={styles.triggerChevron}>⌄</Text>
          </TouchableOpacity>

        </View>

        {/* 3. DATES & CURRENCY */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardSectionTitle}>ORDER SCHEDULE & INVOICING</Text>

          <View style={styles.rowTwo}>
            <TouchableOpacity
              style={styles.colHalf}
              onPress={() => showDatePicker('orderDate')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select Order Date">
              <Text style={styles.inputLabel}>Order Date</Text>
              <View style={styles.pickerTrigger}>
                <Text style={styles.pickerTriggerText}>{formatDate(orderDate) || 'Select Date'}</Text>
                <Text style={{ fontSize: 14 }}>📅</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.colHalf}
              onPress={() => showDatePicker('deliveryDate')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Select Delivery Date">
              <Text style={styles.inputLabel}>Delivery Date</Text>
              <View style={styles.pickerTrigger}>
                <Text style={styles.pickerTriggerText}>{formatDate(deliveryDate) || 'Select Date'}</Text>
                <Text style={{ fontSize: 14 }}>📅</Text>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { marginTop: spacing.sm }]}>Currency</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() =>
              setPickerModal({
                visible: true,
                title: 'Select Currency',
                options: CURRENCIES,
                field: 'currency',
              })
            }>
            <Text style={styles.pickerTriggerText}>{currency}</Text>
            <Text style={styles.triggerChevron}>⌄</Text>
          </TouchableOpacity>
        </View>

        {/* 4. PRODUCTS & ORDER LINES */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.linesHeaderRow}>
            <Text style={styles.cardSectionTitle}>ORDER PRODUCTS & QUANTITIES</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={handleAddLine}>
              <Text style={styles.addLineBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {lines.map((l, index) => {
            const lineSubtotal = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
            const lineTaxAmount = lineSubtotal * (Number(l.taxRate) || 0);
            return (
              <View key={l.id} style={styles.lineCard}>
                <View style={styles.lineTop}>
                  <Text style={styles.lineIndex}>#{index + 1}</Text>
                  <TouchableOpacity
                    style={styles.productSelectTrigger}
                    onPress={() =>
                      setPickerModal({
                        visible: true,
                        title: 'Select Product from Catalog',
                        relation: 'products',
                        field: 'product',
                        lineId: l.id,
                      })
                    }>
                    <Text
                      style={
                        l.productName
                          ? styles.productSelectText
                          : styles.productSelectPlaceholder
                      }
                      numberOfLines={1}>
                      {l.productName || 'Select Product...'}
                    </Text>
                    <Text style={styles.triggerChevron}>⌄</Text>
                  </TouchableOpacity>

                  {lines.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveLine(l.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Text style={styles.deleteIcon}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.lineControlsRow}>
                  {/* Qty Stepper */}
                  <View style={styles.qtyControl}>
                    <Text style={styles.controlLabel}>Qty</Text>
                    <View style={styles.stepperBox}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleUpdateLineQty(l.id, -1)}>
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyVal}>{l.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleUpdateLineQty(l.id, 1)}>
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Unit Price Input */}
                  <View style={styles.priceControl}>
                    <Text style={styles.controlLabel}>Unit Price ({currency})</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="numeric"
                      value={String(l.unitPrice)}
                      onChangeText={val => handleUpdateLinePrice(l.id, val)}
                    />
                  </View>

                  {/* Subtotal */}
                  <View style={styles.subtotalControl}>
                    <Text style={styles.controlLabel}>Subtotal</Text>
                    <Text style={styles.subtotalVal}>
                      {currency} {lineSubtotal.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Tax Selector Row */}
                <View style={styles.lineTaxRow}>
                  <Text style={styles.controlLabel}>Tax</Text>
                  {l.taxId ? (
                    <View style={styles.selectedTaxBadge}>
                      <TouchableOpacity
                        style={styles.taxBadgeContent}
                        onPress={() =>
                          setPickerModal({
                            visible: true,
                            title: 'Select Tax',
                            relation: 'taxes',
                            field: 'lineTax',
                            lineId: l.id,
                            params: { typeTaxUse: 'purchase' },
                          })
                        }>
                        <Text style={styles.selectedTaxText}>
                          🧾 {l.taxName} ({(Number(l.taxRate || 0) * 100).toFixed(0)}%)
                        </Text>
                        <Text style={styles.selectedTaxSub}>
                          +{currency} {lineTaxAmount.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleClearLineTax(l.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={styles.clearTaxBtn}>
                        <Text style={styles.clearTaxBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.taxSelectBtn}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Tax',
                          relation: 'taxes',
                          field: 'lineTax',
                          lineId: l.id,
                          params: { typeTaxUse: 'purchase' },
                        })
                      }>
                      <Text style={styles.taxSelectBtnText}>+ Select Tax (None)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}

          {/* Grand Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Untaxed Amount:</Text>
              <Text style={styles.totalRowValue}>
                {currency} {totals.untaxed.toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Tax Amount:</Text>
              <Text style={styles.totalRowValue}>
                {currency} {totals.tax.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.totalRow, styles.totalRowGrand]}>
              <Text style={styles.grandTotalLabel}>Total Amount:</Text>
              <Text style={styles.grandTotalValue}>
                {currency} {totals.total.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* 5. NOTES */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardSectionTitle}>TERMS & INTERNAL NOTES</Text>
          <TextInput
            style={styles.notesInput}
            multiline
            numberOfLines={3}
            placeholder="Add delivery terms, instructions, or internal notes..."
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.footerActions}>
          {!isEditing && (
            <Button
              title="Create Purchase Order"
              loading={submitting}
              onPress={handleSaveDraft}
            />
          )}

          {isEditing && currentState === 'draft' && !currentOrder?.name && (
            <View style={{ gap: spacing.sm }}>
              <Button
                title="Confirm Order"
                loading={actionLoading}
                onPress={handleConfirmOrder}
              />
              <Button
                title="Save Draft Changes"
                variant="outline"
                loading={submitting}
                onPress={handleSaveDraft}
              />
            </View>
          )}

          {isEditing && currentState === 'draft' && Boolean(currentOrder?.name) && (
            <View style={{ gap: spacing.sm }}>
              <Button
                title="Send for Approval →"
                loading={actionLoading}
                onPress={handleSendForApproval}
              />
              <Button
                title="Save Draft Changes"
                variant="outline"
                loading={submitting}
                onPress={handleSaveDraft}
              />
            </View>
          )}

          {isEditing && currentState === 'to_approve' && (
            <Button
              title="Admin Approve (Generate Direct Bill) ✓"
              variant="secondary"
              loading={actionLoading}
              onPress={handleApproveOrder}
            />
          )}
        </View>
      </ScrollView>

      {/* Dynamic Master Data Picker Modal */}
      <PickerModal
        visible={pickerModal.visible}
        title={pickerModal.title}
        relation={pickerModal.relation}
        options={pickerModal.options}
        params={pickerModal.params}
        onClose={() => setPickerModal(p => ({ ...p, visible: false }))}
        onSelect={handlePickerSelect}
      />

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={isDatePickerVisible}
        mode="date"
        date={parseSafeDate(activeDateField === 'deliveryDate' ? deliveryDate : orderDate)}
        onConfirm={handleConfirm}
        onCancel={hideDatePicker}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  stepperCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  stepperTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '800',
  },
  stepTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepActiveSuccess: {
    backgroundColor: colors.secondary,
  },
  stepDotNum: {
    color: colors.textInverted,
    fontSize: 11,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
    marginRight: 4,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.disabled,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  linkedBillBtn: {
    marginTop: spacing.md,
    backgroundColor: '#E0F2FE',
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    alignItems: 'center',
  },
  linkedBillBtnText: {
    color: '#0369A1',
    fontWeight: '700',
    fontSize: 12,
  },
  linkedReceiptBox: {
    marginTop: spacing.sm,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: spacing.sm,
  },
  linkedReceiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  linkedReceiptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  linkedReceiptSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2,
  },
  receiptDoneBanner: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radius.xs,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  receiptDoneBannerText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  btnReceiveGoods: {
    backgroundColor: '#F59E0B',
    paddingVertical: 8,
    borderRadius: radius.xs,
    alignItems: 'center',
    marginTop: 4,
  },
  btnReceiveGoodsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnReceiveGoodsLocked: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  btnReceiveGoodsTextLocked: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSectionTitle: {
    ...typography.tiny,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  typeSegmentRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: 3,
    gap: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.xs,
  },
  typeBtnActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  typeHelpText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs + 2,
    lineHeight: 16,
  },
  inputLabel: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: 4,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 10,
  },
  pickerTriggerText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
  },
  pickerPlaceholder: {
    fontSize: 13,
    color: colors.textMuted,
  },
  triggerChevron: {
    fontSize: 14,
    color: colors.textMuted,
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
  },
  addressBoxContent: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colHalf: {
    flex: 1,
  },
  textInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.text,
  },
  linesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addLineBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  addLineBtnText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  lineCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  lineTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  lineIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginRight: 6,
  },
  productSelectTrigger: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  productSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  productSelectPlaceholder: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deleteIcon: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.danger,
    fontWeight: '700',
  },
  lineControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  qtyControl: {
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  qtyVal: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    color: colors.text,
  },
  priceControl: {
    width: 100,
  },
  priceInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    color: colors.text,
    textAlign: 'right',
  },
  subtotalControl: {
    alignItems: 'flex-end',
  },
  subtotalVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  lineTaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs + 4,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  taxSelectBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  taxSelectBtnText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  selectedTaxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  taxBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedTaxText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  selectedTaxSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
    marginLeft: 4,
  },
  clearTaxBtn: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  clearTaxBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
  },
  totalsBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRowLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  totalRowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  totalRowGrand: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  notesInput: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.sm,
    fontSize: 12,
    color: colors.text,
    textAlignVertical: 'top',
  },
  footerActions: {
    marginTop: spacing.sm,
  },
});
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
import { salesApi } from '../../api/sales';
import { colors, radius, spacing, shadows, typography } from '../../theme/theme';
import { navigationScreen } from '../../navigation/navigationScreen/navigationScreen';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
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

function formatCustomerAddress(c) {
  if (!c) return 'No address provided';
  if (typeof c.address === 'string' && c.address) return c.address;
  const streetPart = [c.street, c.street2].filter(Boolean).join(', ');
  const cityPart = [c.city, c.state, c.zip].filter(Boolean).join(' ');
  const parts = [streetPart, cityPart, c.country].filter(Boolean).join('\n');
  return parts || 'No address provided';
}

function formatWarehouseAddress(w) {
  if (!w) return 'No warehouse address';
  const parts = [w.address, w.city, w.state, w.country].filter(Boolean).join(', ');
  return parts || 'No warehouse address';
}

const ORDER_TYPES = [
  { key: 'adhoc', label: 'Adhoc', desc: 'Direct order without prior requisition (Direct Bill flow)' },
  { key: 'normal', label: 'Direct', desc: 'Order based on standard quotation requisition' },
  { key: 'arc', label: 'ARC', desc: 'Annual Rate Contract order' },
  { key: 'open_order', label: 'Open Order', desc: 'Continuous open order blanket agreement' },
  { key: 'scheduled', label: 'Scheduled', desc: 'Periodic scheduled dispatch delivery' },
];

const CURRENCIES = [
  { value: 'INR', label: 'INR (₹) - Indian Rupee' },
  { value: 'USD', label: 'USD ($) - US Dollar' },
  { value: 'EUR', label: 'EUR (€) - Euro' },
  { value: 'GBP', label: 'GBP (£) - British Pound' },
];

export default function SalesOrderFormScreen({ navigation, route }) {
  const initialOrder = route?.params?.order;
  const initialOrderId = route?.params?.orderId || route?.params?.id || initialOrder?.id;

  const [currentOrder, setCurrentOrder] = useState(initialOrder || null);
  const isEditing = Boolean(initialOrderId || currentOrder?.id);

  // Form Fields
  const [orderType, setOrderType] = useState(initialOrder?.type || initialOrder?.orderType || 'adhoc');
  const [customer, setCustomer] = useState(
    initialOrder?.customerRecord || initialOrder?.customer
      ? {
          value:
            initialOrder.customerId ||
            initialOrder.customerRecord?.id ||
            (typeof initialOrder.customer === 'object' ? initialOrder.customer.id : null),
          label:
            typeof initialOrder.customer === 'string'
              ? initialOrder.customer
              : initialOrder.customer?.name || initialOrder.customerRecord?.name || 'Customer',
          address: formatCustomerAddress(
            initialOrder.customerRecord ||
            (typeof initialOrder.customer === 'object' ? initialOrder.customer : null),
          ),
          record:
            initialOrder.customerRecord ||
            (typeof initialOrder.customer === 'object' ? initialOrder.customer : null),
        }
      : null,
  );

  const [warehouse, setWarehouse] = useState(
    initialOrder?.warehouse
      ? {
          value: initialOrder.warehouse.id,
          label: initialOrder.warehouse.name,
          address: formatWarehouseAddress(initialOrder.warehouse),
          record: initialOrder.warehouse,
        }
      : null,
  );

  const [division, setDivision] = useState(
    initialOrder?.division
      ? {
          value: initialOrder.division.id,
          label: initialOrder.division.code
            ? `${initialOrder.division.name} (${initialOrder.division.code})`
            : initialOrder.division.name,
          record: initialOrder.division,
        }
      : null,
  );

  const [currency, setCurrency] = useState(initialOrder?.currency || 'INR');
  const [orderDate, setOrderDate] = useState(
    initialOrder?.orderDate || initialOrder?.date
      ? String(initialOrder.orderDate || initialOrder.date).slice(0, 10)
      : getTodayString(),
  );
  const [deliveryDate, setDeliveryDate] = useState(
    initialOrder?.deliveryDate
      ? String(initialOrder.deliveryDate).slice(0, 10)
      : getDefaultDeliveryDate(),
  );
  const [clientPoDate, setClientPoDate] = useState(
    initialOrder?.clientPoDate ? String(initialOrder.clientPoDate).slice(0, 10) : '',
  );
  const [poRefNo, setPoRefNo] = useState(
    initialOrder?.poRefNo || initialOrder?.clientRef || '',
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialOrder?.deliveryAddress || initialOrder?.shippingAddress || '',
  );
  const [deliveryDays, setDeliveryDays] = useState(
    initialOrder?.deliveryDays !== undefined && initialOrder?.deliveryDays !== null
      ? String(initialOrder.deliveryDays)
      : '7',
  );
  const [notes, setNotes] = useState(initialOrder?.note || initialOrder?.notes || '');

  // Lines
  const [lines, setLines] = useState(
    initialOrder?.lines && initialOrder.lines.length > 0
      ? initialOrder.lines.map((l, idx) => {
          const rate = l.tax ? (Number(l.tax.amount) || 0) / 100 : 0;
          return {
            id: l.id || `line-${idx}`,
            productId: l.productId || l.product?.id,
            productName: l.productName || l.product?.name || l.description || 'Sales Item',
            quantity: Number(l.quantity || 1),
            unitPrice: Number(l.unitPrice || 0),
            discount: Number(l.discount || 0),
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
            discount: 0,
            taxId: null,
            taxRate: 0,
            taxName: null,
          },
        ],
  );

  // Modals & Pickers
  const [pickerModal, setPickerModal] = useState({
    visible: false,
    title: '',
    relation: null,
    options: null,
    field: null,
    lineId: null,
    params: null,
  });

  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [activeDateField, setActiveDateField] = useState('orderDate');

  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch full order if ID provided
  useEffect(() => {
    if (!initialOrderId) return;
    salesApi
      .getOrderDetail(initialOrderId)
      .then(res => {
        if (!res) return;
        setCurrentOrder(res);
        if (res.type || res.orderType) setOrderType(res.type || res.orderType);
        if (res.customer || res.customerRecord) {
          const cust = res.customerRecord || (typeof res.customer === 'object' ? res.customer : null);
          setCustomer({
            value: res.customerId || cust?.id,
            label: typeof res.customer === 'string' ? res.customer : cust?.name || 'Customer',
            address: formatCustomerAddress(cust),
            record: cust,
          });
        }
        if (res.warehouse) {
          setWarehouse({
            value: res.warehouse.id,
            label: res.warehouse.name,
            address: formatWarehouseAddress(res.warehouse),
            record: res.warehouse,
          });
        }
        if (res.division) {
          setDivision({
            value: res.division.id,
            label: res.division.code ? `${res.division.name} (${res.division.code})` : res.division.name,
            record: res.division,
          });
        }
        if (res.orderDate || res.date) {
          setOrderDate(String(res.orderDate || res.date).slice(0, 10));
        }
        if (res.deliveryDate) {
          setDeliveryDate(String(res.deliveryDate).slice(0, 10));
        }
        if (res.clientPoDate) {
          setClientPoDate(String(res.clientPoDate).slice(0, 10));
        }
        if (res.poRefNo || res.clientRef) {
          setPoRefNo(res.poRefNo || res.clientRef);
        }
        if (res.deliveryAddress || res.shippingAddress) {
          setDeliveryAddress(res.deliveryAddress || res.shippingAddress);
        }
        if (res.deliveryDays !== undefined && res.deliveryDays !== null) {
          setDeliveryDays(String(res.deliveryDays));
        }
        if (res.note || res.notes) {
          setNotes(res.note || res.notes);
        }
        if (Array.isArray(res.lines) && res.lines.length > 0) {
          setLines(
            res.lines.map((l, idx) => {
              const rate = l.tax ? (Number(l.tax.amount) || 0) / 100 : 0;
              return {
                id: l.id || `line-${idx}`,
                productId: l.productId || l.product?.id,
                productName: l.productName || l.product?.name || l.description || 'Sales Item',
                quantity: Number(l.quantity || 1),
                unitPrice: Number(l.unitPrice || 0),
                discount: Number(l.discount || 0),
                taxId: l.taxId || l.tax?.id || null,
                taxRate: rate,
                taxName: l.tax?.name || (l.tax?.amount ? `${l.tax.amount}%` : null),
              };
            }),
          );
        }
      })
      .catch(err => console.warn('Failed to fetch sales order:', err));
  }, [initialOrderId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing
        ? currentOrder?.soNumber || currentOrder?.name || 'Sales Order'
        : 'New Sales Order',
    });
  }, [navigation, isEditing, currentOrder]);

  // Calculations
  const totals = useMemo(() => {
    let untaxed = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    lines.forEach(l => {
      const qty = Number(l.quantity) || 0;
      const price = Number(l.unitPrice) || 0;
      const base = qty * price;
      const disc = base * ((Number(l.discount) || 0) / 100);
      const sub = base - disc;
      const tx = sub * (Number(l.taxRate) || 0);

      untaxed += sub;
      discountTotal += disc;
      taxTotal += tx;
    });

    return {
      untaxed,
      discount: discountTotal,
      tax: taxTotal,
      total: untaxed + taxTotal,
    };
  }, [lines]);

  // Line Handlers
  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        productId: null,
        productName: '',
        quantity: 1,
        unitPrice: 0,
        discount: 0,
        taxId: null,
        taxRate: 0,
        taxName: null,
      },
    ]);
  };

  const handleRemoveLine = id => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateLineQty = (id, delta) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        const newQty = Math.max(1, (Number(l.quantity) || 1) + delta);
        return { ...l, quantity: newQty };
      }),
    );
  };

  const handleUpdateLinePrice = (id, priceStr) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        return { ...l, unitPrice: priceStr };
      }),
    );
  };

  const handleUpdateLineDiscount = (id, discStr) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        return { ...l, discount: discStr };
      }),
    );
  };

  const handleClearLineTax = id => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        return { ...l, taxId: null, taxRate: 0, taxName: null };
      }),
    );
  };

  // Date Pickers
  const showDatePicker = field => {
    setActiveDateField(field);
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirmDate = date => {
    const dStr = date.toISOString().split('T')[0];
    if (activeDateField === 'orderDate') setOrderDate(dStr);
    else if (activeDateField === 'deliveryDate') setDeliveryDate(dStr);
    else if (activeDateField === 'clientPoDate') setClientPoDate(dStr);
    hideDatePicker();
  };

  // Picker Select Handler
  const handlePickerSelect = item => {
    if (!item) {
      setPickerModal(p => ({ ...p, visible: false }));
      return;
    }

    const rec = item.record || item;
    const val = item.value !== undefined ? item.value : (rec?.id !== undefined ? rec.id : item?.id);
    const lbl = item.label || rec?.name || item?.name || '';

    if (pickerModal.field === 'customer') {
      if (!val && !lbl) {
        setCustomer(null);
      } else {
        const addr = formatCustomerAddress(rec);
        setCustomer({
          value: val,
          label: lbl,
          address: addr,
          record: rec,
        });
        if (!deliveryAddress || deliveryAddress === 'No address provided') {
          setDeliveryAddress(addr);
        }
        if (rec?.currency) {
          setCurrency(rec.currency);
        }
      }
    } else if (pickerModal.field === 'warehouse') {
      if (!val && !lbl) {
        setWarehouse(null);
      } else {
        setWarehouse({
          value: val,
          label: lbl,
          address: formatWarehouseAddress(rec),
          record: rec,
        });
      }
    } else if (pickerModal.field === 'division') {
      if (!val && !lbl) {
        setDivision(null);
      } else {
        const divLabel = rec?.code ? `${rec.name || lbl} (${rec.code})` : (lbl || rec?.name);
        setDivision({
          value: val,
          label: divLabel,
          record: rec,
        });
      }
    } else if (pickerModal.field === 'currency') {
      setCurrency(val || lbl || 'INR');
    } else if (pickerModal.field === 'product') {
      const price = Number(rec?.salesPrice ?? rec?.listPrice ?? rec?.costPrice ?? 0);
      const taxObj = rec?.taxes && rec.taxes.length > 0 ? rec.taxes[0] : null;
      const taxRate = taxObj ? (Number(taxObj.amount) || 0) / 100 : 0;
      const taxName = taxObj ? (taxObj.name || `${taxObj.amount}%`) : null;

      setLines(prev =>
        prev.map(l => {
          if (l.id !== pickerModal.lineId) return l;
          return {
            ...l,
            productId: val,
            productName: lbl,
            unitPrice: price > 0 ? price : (l.unitPrice || 0),
            taxId: taxObj ? taxObj.id : l.taxId,
            taxRate: taxObj ? taxRate : l.taxRate,
            taxName: taxObj ? taxName : l.taxName,
          };
        }),
      );
    } else if (pickerModal.field === 'lineTax') {
      const amount = Number(rec?.amount) || 0;
      const rate = rec?.amountType === 'percent' || !rec?.amountType ? amount / 100 : 0;
      const taxLabel = rec?.name || (amount ? `${amount}%` : null);

      setLines(prev =>
        prev.map(l => {
          if (l.id !== pickerModal.lineId) return l;
          return {
            ...l,
            taxId: val,
            taxRate: rate,
            taxName: taxLabel,
          };
        }),
      );
    }
    setPickerModal(p => ({ ...p, visible: false }));
  };

  // Save / Update Handler
  const handleSave = async (sendImmediately = false) => {
    if (!customer?.value) {
      Alert.alert('Validation Error', 'Please select a Customer.');
      return;
    }
    if (!warehouse?.value) {
      Alert.alert('Validation Error', 'Please select a Warehouse.');
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
      orderType,
      customerId: customer.value,
      warehouseId: warehouse.value,
      divisionId: division.value,
      currency,
      deliveryAddress: deliveryAddress.trim() || undefined,
      poRefNo: poRefNo.trim() || undefined,
      clientPoDate: clientPoDate ? new Date(clientPoDate).toISOString() : undefined,
      orderDate: new Date(orderDate).toISOString(),
      deliveryDate: new Date(deliveryDate).toISOString(),
      deliveryDays: parseInt(deliveryDays, 10) || 7,
      note: notes.trim() || undefined,
      lines: lines.map(l => ({
        productId: l.productId,
        description: l.productName,
        quantity: Number(l.quantity) || 1,
        unitPrice: Number(l.unitPrice) || 0,
        discount: Number(l.discount) || 0,
        taxId: l.taxId || undefined,
      })),
    };

    setSubmitting(true);
    try {
      if (currentOrder?.id) {
        const updated = await salesApi.updateOrder(currentOrder.id, payload);
        if (sendImmediately) {
          await salesApi.sendForApproval(currentOrder.id);
          const fullOrder = await salesApi.getOrderDetail(currentOrder.id);
          setCurrentOrder(fullOrder);
          Alert.alert('Success', `Sales Order ${fullOrder.soNumber || fullOrder.name} updated and sent for approval!`);
        } else {
          setCurrentOrder(updated);
          Alert.alert('Draft Saved', 'Sales Order draft has been updated successfully.');
        }
      } else {
        const created = await salesApi.createOrder(payload);
        if (sendImmediately && created?.id) {
          await salesApi.sendForApproval(created.id);
          const fullOrder = await salesApi.getOrderDetail(created.id);
          setCurrentOrder(fullOrder);
          Alert.alert('Success', `Sales Order ${fullOrder.soNumber || fullOrder.name} created and sent for approval!`);
        } else {
          setCurrentOrder(created);
          Alert.alert('Draft Created', 'Sales Order created as Draft Quotation.');
        }
      }
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || err?.message || 'Failed to save Sales Order');
    } finally {
      setSubmitting(false);
    }
  };

  // Send for Approval
  const handleSendForApproval = async () => {
    if (!currentOrder?.id) return;
    setActionLoading(true);
    try {
      await salesApi.sendForApproval(currentOrder.id);
      const updated = await salesApi.getOrderDetail(currentOrder.id);
      setCurrentOrder(updated);
      Alert.alert('Sent for Approval!', `Sales Order ${updated.soNumber || updated.name} submitted for management approval.`);
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send for approval');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Approve Order -> Direct Customer Bill & Delivery Order
  const handleApproveOrder = async () => {
    if (!currentOrder?.id) return;
    setActionLoading(true);
    try {
      const res = await salesApi.approveOrder(currentOrder.id);
      setCurrentOrder(res);
      const bill = res?.customerInvoice;
      const picking = res?.stockPicking;
      Alert.alert(
        'SO Approved!',
        `Sales Order ${res.soNumber || res.name} approved!\n\n🧾 Customer Bill: ${bill?.invoiceNumber || 'Draft Bill'}\n📦 Delivery Order: ${picking?.name || 'Created'}\n\nInventory dispatch & Accounting entries are ready!`,
        [
          { text: 'Stay Here', style: 'cancel' },
          {
            text: 'Open Customer Bill',
            onPress: () => {
              if (bill) {
                navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                  invoice: bill,
                  invoiceId: bill.id,
                });
              } else {
                navigation.navigate(navigationScreen.CUSTOMER_INVOICES);
              }
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to approve Sales Order');
    } finally {
      setActionLoading(false);
    }
  };

  // Deliver Goods (Deduct Stock)
  const handleDeliverGoods = async () => {
    if (!currentOrder?.id) return;
    const billState = currentOrder.customerInvoice?.state?.toLowerCase();
    const isBillValidated =
      billState === 'open' || billState === 'posted' || billState === 'paid';

    if (!isBillValidated) {
      Alert.alert(
        'Invoice Validation Required',
        `Stock delivery cannot be validated yet!\n\nThe Customer Bill (${currentOrder.customerInvoice?.invoiceNumber || 'Draft'}) must be validated before physical goods can be delivered out of warehouse stock.\n\nWould you like to open and validate the Customer Bill now?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Customer Bill',
            onPress: () => {
              if (currentOrder.customerInvoice) {
                navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                  invoice: currentOrder.customerInvoice,
                  invoiceId: currentOrder.customerInvoice.id,
                });
              } else {
                navigation.navigate(navigationScreen.CUSTOMER_INVOICES);
              }
            },
          },
        ],
      );
      return;
    }

    setActionLoading(true);
    try {
      const updated = await salesApi.deliverGoods(currentOrder.id);
      setCurrentOrder(updated);
      Alert.alert(
        'Stock Updated!',
        `Goods delivered for ${updated.soNumber || updated.name}!\n\nDelivery ${updated?.stockPicking?.name || ''} validated and deducted from Warehouse on-hand stock.`,
      );
    } catch (err) {
      Alert.alert('Validation Error', err?.response?.data?.message || 'Failed to deliver goods');
    } finally {
      setActionLoading(false);
    }
  };

  const currentState =
    currentOrder?.state === 'sale' ? 'approved' : currentOrder?.state || 'draft';
  const billState = currentOrder?.customerInvoice?.state?.toLowerCase();
  const isBillValidated =
    billState === 'open' || billState === 'posted' || billState === 'paid';

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* State Banner / Stepper (Exact PO Form Stepper) */}
        {isEditing && (
          <View style={[styles.stepperCard, shadows.sm]}>
            <View style={styles.stepperTop}>
              <Text style={styles.stepperTitle}>
                {currentOrder?.soNumber || currentOrder?.name || 'Sales Order'}
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
                  (currentState === 'to_approve' ||
                    currentState === 'sent_for_approval' ||
                    currentState === 'approved') &&
                    styles.stepLineActive,
                ]}
              />

              <View
                style={[
                  styles.stepDot,
                  (currentState === 'to_approve' ||
                    currentState === 'sent_for_approval' ||
                    currentState === 'approved') &&
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
            {currentOrder?.customerInvoice && (
              <TouchableOpacity
                style={styles.linkedBillBtn}
                onPress={() =>
                  navigation.navigate(navigationScreen.CUSTOMER_INVOICE_DETAIL, {
                    invoice: currentOrder.customerInvoice,
                    invoiceId: currentOrder.customerInvoice.id,
                  })
                }>
                <Text style={styles.linkedBillBtnText}>
                  🧾 View Generated Customer Bill: {currentOrder.customerInvoice.invoiceNumber || 'Draft Bill'} ›
                </Text>
              </TouchableOpacity>
            )}

            {/* Linked Delivery Order & Goods Dispatch */}
            {currentOrder?.stockPicking && (
              <View style={styles.linkedReceiptBox}>
                <View style={styles.linkedReceiptHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.linkedReceiptTitle}>
                      📦 Outgoing Delivery: {currentOrder.stockPicking.name}
                    </Text>
                    <Text style={styles.linkedReceiptSub}>
                      Origin: {currentOrder.warehouse?.name || 'Warehouse'} ➔ Customer
                    </Text>
                  </View>
                  <StateBadge state={currentOrder.stockPicking.state} />
                </View>

                {currentOrder.stockPicking.state === 'done' ? (
                  <View style={styles.receiptDoneBanner}>
                    <Text style={styles.receiptDoneBannerText}>
                      ✓ Goods Delivered & Warehouse Stock Updated
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
                    onPress={handleDeliverGoods}>
                    <Text
                      style={[
                        styles.btnReceiveGoodsText,
                        !isBillValidated && styles.btnReceiveGoodsTextLocked,
                      ]}>
                      {actionLoading
                        ? 'Delivering...'
                        : isBillValidated
                        ? '📦 Deliver Goods (Update Warehouse Stock) ✓'
                        : '🔒 Validate Bill First to Deliver Stock'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* 1. ORDER TYPE SELECTOR */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardSectionTitle}>SALE ORDER TYPE</Text>
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

        {/* 2. CORE DETAILS: Customer, Warehouse, Division */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardSectionTitle}>SALE PARTNERS & LOCATIONS</Text>

          {/* Customer */}
          <Text style={styles.inputLabel}>Customer *</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() =>
              setPickerModal({
                visible: true,
                title: 'Select Customer',
                relation: 'customers',
                field: 'customer',
              })
            }>
            <Text style={customer?.label ? styles.pickerTriggerText : styles.pickerPlaceholder}>
              {customer?.label || 'Select Customer...'}
            </Text>
            <Text style={styles.triggerChevron}>⌄</Text>
          </TouchableOpacity>

          {customer?.address ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressBoxTitle}>Customer Address:</Text>
              <Text style={styles.addressBoxContent}>{customer.address}</Text>
            </View>
          ) : null}

          {/* Deliver From Warehouse */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
            Warehouse (Dispatch Location) *
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
            <Text style={warehouse?.label ? styles.pickerTriggerText : styles.pickerPlaceholder}>
              {warehouse?.label || 'Select Warehouse...'}
            </Text>
            <Text style={styles.triggerChevron}>⌄</Text>
          </TouchableOpacity>
          {warehouse?.address ? (
            <View style={styles.addressBox}>
              <Text style={styles.addressBoxTitle}>Warehouse Address:</Text>
              <Text style={styles.addressBoxContent}>{warehouse.address}</Text>
            </View>
          ) : null}

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
            <Text style={division?.label ? styles.pickerTriggerText : styles.pickerPlaceholder}>
              {division?.label || 'Select Division...'}
            </Text>
            <Text style={styles.triggerChevron}>⌄</Text>
          </TouchableOpacity>

          {/* Delivery Address (Destination) */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
            Delivery Address (Destination)
          </Text>
          <TextInput
            style={[styles.textInput, { minHeight: 44 }]}
            multiline
            placeholder="Client delivery destination address..."
            placeholderTextColor={colors.textMuted}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
          />

          {/* Client PO Ref & Date */}
          <View style={[styles.rowTwo, { marginTop: spacing.sm }]}>
            <View style={styles.colHalf}>
              <Text style={styles.inputLabel}>Client PO Ref #</Text>
              <TextInput
                style={styles.textInput}
                placeholder="PO/Ref Number"
                placeholderTextColor={colors.textMuted}
                value={poRefNo}
                onChangeText={setPoRefNo}
              />
            </View>

            <TouchableOpacity
              style={styles.colHalf}
              onPress={() => showDatePicker('clientPoDate')}
              activeOpacity={0.7}>
              <Text style={styles.inputLabel}>Client PO Date</Text>
              <View style={styles.pickerTrigger}>
                <Text style={styles.pickerTriggerText}>
                  {clientPoDate ? formatDate(clientPoDate) : 'Select Date'}
                </Text>
                <Text style={{ fontSize: 14 }}>📅</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. DATES & CURRENCY */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardSectionTitle}>ORDER SCHEDULE & INVOICING</Text>

          <View style={styles.rowTwo}>
            <TouchableOpacity
              style={styles.colHalf}
              onPress={() => showDatePicker('orderDate')}
              activeOpacity={0.7}>
              <Text style={styles.inputLabel}>Order Date</Text>
              <View style={styles.pickerTrigger}>
                <Text style={styles.pickerTriggerText}>{formatDate(orderDate) || 'Select Date'}</Text>
                <Text style={{ fontSize: 14 }}>📅</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.colHalf}
              onPress={() => showDatePicker('deliveryDate')}
              activeOpacity={0.7}>
              <Text style={styles.inputLabel}>Delivery Date</Text>
              <View style={styles.pickerTrigger}>
                <Text style={styles.pickerTriggerText}>{formatDate(deliveryDate) || 'Select Date'}</Text>
                <Text style={{ fontSize: 14 }}>📅</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.rowTwo, { marginTop: spacing.sm }]}>
            <View style={styles.colHalf}>
              <Text style={styles.inputLabel}>Delivery Days</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={deliveryDays}
                onChangeText={setDeliveryDays}
                placeholder="7"
              />
            </View>

            <View style={styles.colHalf}>
              <Text style={styles.inputLabel}>Currency</Text>
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
          </View>
        </View>

        {/* 4. PRODUCTS & ORDER LINES (Exact PO Form) */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.linesHeaderRow}>
            <Text style={styles.cardSectionTitle}>ORDER PRODUCTS & QUANTITIES</Text>
            <TouchableOpacity style={styles.addLineBtn} onPress={handleAddLine}>
              <Text style={styles.addLineBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {lines.map((l, index) => {
            const lineSubtotal = (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);
            const lineDisc = lineSubtotal * ((Number(l.discount) || 0) / 100);
            const lineTaxable = lineSubtotal - lineDisc;
            const lineTaxAmount = lineTaxable * (Number(l.taxRate) || 0);

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

                  {/* Discount % Input */}
                  <View style={styles.discountControl}>
                    <Text style={styles.controlLabel}>Disc %</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="numeric"
                      value={String(l.discount || 0)}
                      onChangeText={val => handleUpdateLineDiscount(l.id, val)}
                    />
                  </View>

                  {/* Subtotal */}
                  <View style={styles.subtotalControl}>
                    <Text style={styles.controlLabel}>Subtotal</Text>
                    <Text style={styles.subtotalVal}>
                      ₹{(lineTaxable + lineTaxAmount).toFixed(2)}
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
                            params: { typeTaxUse: 'sale' },
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
                          params: { typeTaxUse: 'sale' },
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
            {totals.discount > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalRowLabel, { color: '#059669' }]}>Total Discount:</Text>
                <Text style={[styles.totalRowValue, { color: '#059669' }]}>
                  -{currency} {totals.discount.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Tax Amount (GST):</Text>
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
            placeholder="Add payment terms, dispatch instructions, or customer notes..."
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* ACTION BUTTONS (Exact PO Form Actions) */}
        <View style={styles.footerActions}>
          {!isEditing && (
            <View style={{ gap: spacing.sm }}>
              <Button
                title="Create Sales Order"
                loading={submitting}
                onPress={() => handleSave(false)}
              />
              <Button
                title="Save & Send for Approval →"
                variant="outline"
                loading={submitting}
                onPress={() => handleSave(true)}
              />
            </View>
          )}

          {isEditing && currentState === 'draft' && (
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
                onPress={() => handleSave(false)}
              />
            </View>
          )}

          {isEditing && (currentState === 'to_approve' || currentState === 'sent_for_approval') && (
            <View style={{ gap: spacing.sm }}>
              <Button
                title="Admin Approve (Generate Direct Bill) ✓"
                variant="secondary"
                loading={actionLoading}
                onPress={handleApproveOrder}
              />
              <Button
                title="Save Draft Changes"
                variant="outline"
                loading={submitting}
                onPress={() => handleSave(false)}
              />
            </View>
          )}

          {isEditing && (currentState === 'approved' || currentState === 'sale') && (
            <View style={styles.receiptDoneBanner}>
              <Text style={styles.receiptDoneBannerText}>
                ✓ Sale Order Approved & Confirmed
              </Text>
            </View>
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
        date={parseSafeDate(
          activeDateField === 'deliveryDate'
            ? deliveryDate
            : activeDateField === 'clientPoDate'
            ? clientPoDate
            : orderDate,
        )}
        onConfirm={handleConfirmDate}
        onCancel={hideDatePicker}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
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
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: colors.primary,
  },
  stepActiveSuccess: {
    backgroundColor: '#16A34A',
  },
  stepDotNum: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepLabel: {
    ...typography.tiny,
    fontWeight: '700',
    color: colors.textSecondary,
    marginLeft: 6,
    marginRight: 8,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  linkedBillBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: radius.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  linkedBillBtnText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '700',
  },
  linkedReceiptBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.xs,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  linkedReceiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkedReceiptTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#166534',
  },
  linkedReceiptSub: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  receiptDoneBanner: {
    backgroundColor: '#DCFCE7',
    paddingVertical: 8,
    borderRadius: radius.xs,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  receiptDoneBannerText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '700',
  },
  btnReceiveGoods: {
    backgroundColor: '#16A34A',
    paddingVertical: 9,
    borderRadius: radius.xs,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  btnReceiveGoodsLocked: {
    backgroundColor: '#E2E8F0',
  },
  btnReceiveGoodsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnReceiveGoodsTextLocked: {
    color: '#64748B',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardSectionTitle: {
    ...typography.caption,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  typeSegmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  typeTextActive: {
    color: colors.textInverted,
    fontWeight: '700',
  },
  typeHelpText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  pickerTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    minHeight: 40,
  },
  pickerTriggerText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  pickerPlaceholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  triggerChevron: {
    fontSize: 14,
    color: colors.textMuted,
    marginLeft: 6,
  },
  addressBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.xs,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  addressBoxContent: {
    fontSize: 12,
    color: colors.text,
    marginTop: 2,
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
    paddingHorizontal: spacing.sm,
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addLineBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
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
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  lineIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    width: 24,
  },
  productSelectTrigger: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  productSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  productSelectPlaceholder: {
    fontSize: 12,
    color: colors.textMuted,
  },
  deleteIcon: {
    fontSize: 14,
    color: colors.danger,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontWeight: '800',
  },
  lineControlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  qtyControl: {
    width: 80,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    height: 34,
  },
  stepBtn: {
    width: 24,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSubtle,
  },
  stepBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  qtyVal: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  priceControl: {
    flex: 1.2,
  },
  discountControl: {
    width: 55,
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 2,
  },
  priceInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    height: 34,
    fontSize: 12,
    color: colors.text,
    textAlign: 'right',
  },
  subtotalControl: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  subtotalVal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 6,
  },
  lineTaxRow: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedTaxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 2,
  },
  taxBadgeContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedTaxText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  selectedTaxSub: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  clearTaxBtn: {
    marginLeft: 8,
  },
  clearTaxBtnText: {
    fontSize: 11,
    color: colors.danger,
    fontWeight: '800',
  },
  taxSelectBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  taxSelectBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  totalsBox: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalRowLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  totalRowValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  totalRowGrand: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  grandTotalValue: {
    fontSize: 14,
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  footerActions: {
    marginTop: spacing.xs,
  },
});

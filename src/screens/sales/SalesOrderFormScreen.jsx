import React, { useLayoutEffect, useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
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

const ORDER_TYPES = [
  { key: 'adhoc', label: 'Adhoc Order', icon: '⚡' },
  { key: 'normal', label: 'Normal / Direct', icon: '📦' },
  { key: 'arc', label: 'ARC', icon: '📝' },
  { key: 'open_order', label: 'Open Order', icon: '🔄' },
  { key: 'scheduled', label: 'Scheduled', icon: '🗓️' },
];

export default function SalesOrderFormScreen({ navigation, route }) {
  const initialOrder = route?.params?.order;
  const editOrderId = route?.params?.orderId || route?.params?.id || initialOrder?.id;
  const isEditMode = Boolean(editOrderId);

  const [orderInfo, setOrderInfo] = useState(initialOrder || null);
  const [loadingOrder, setLoadingOrder] = useState(
    Boolean(isEditMode && (!initialOrder || !Array.isArray(initialOrder.lines) || initialOrder.lines.length === 0)),
  );

  // Header State
  const [orderType, setOrderType] = useState(
    initialOrder?.type || initialOrder?.orderType || 'adhoc',
  );
  const [division, setDivision] = useState(
    initialOrder?.division
      ? { value: initialOrder.division.id, label: initialOrder.division.name }
      : null,
  );
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
          record:
            initialOrder.customerRecord ||
            (typeof initialOrder.customer === 'object' ? initialOrder.customer : null),
        }
      : null,
  );
  const [deliveryAddress, setDeliveryAddress] = useState(
    initialOrder?.deliveryAddress || initialOrder?.shippingAddress || '',
  );
  const [poRefNo, setPoRefNo] = useState(
    initialOrder?.poRefNo || initialOrder?.clientRef || '',
  );
  const [clientPoDate, setClientPoDate] = useState(
    initialOrder?.clientPoDate ? new Date(initialOrder.clientPoDate) : null,
  );
  const [orderDate, setOrderDate] = useState(
    initialOrder?.orderDate || initialOrder?.date
      ? new Date(initialOrder.orderDate || initialOrder.date)
      : new Date(),
  );
  const [deliveryDays, setDeliveryDays] = useState(
    initialOrder?.deliveryDays !== undefined && initialOrder?.deliveryDays !== null
      ? String(initialOrder.deliveryDays)
      : '7',
  );
  const [warehouse, setWarehouse] = useState(
    initialOrder?.warehouse
      ? { value: initialOrder.warehouse.id, label: initialOrder.warehouse.name }
      : null,
  );
  const [pricelist, setPricelist] = useState(
    initialOrder?.pricelist
      ? { value: initialOrder.pricelist.id, label: initialOrder.pricelist.name }
      : null,
  );
  const [paymentTerm, setPaymentTerm] = useState(
    initialOrder?.paymentTerm
      ? { value: initialOrder.paymentTerm.id, label: initialOrder.paymentTerm.name }
      : null,
  );
  const [transporter, setTransporter] = useState(
    initialOrder?.transporter
      ? { value: initialOrder.transporter.id, label: initialOrder.transporter.name }
      : null,
  );
  const [transporterName, setTransporterName] = useState(
    initialOrder?.transporterName || '',
  );
  const [notes, setNotes] = useState(initialOrder?.note || initialOrder?.notes || '');

  // Line items state
  const [lines, setLines] = useState(
    Array.isArray(initialOrder?.lines) && initialOrder.lines.length > 0
      ? initialOrder.lines.map((l, idx) => ({
          id: l.id || `line-${idx}-${Date.now()}`,
          productId: l.productId || l.product?.id,
          productName: l.productName || l.product?.name || l.description || 'Product',
          quantity: Number(l.quantity || 1),
          unitPrice: Number(l.unitPrice || 0),
          discount: Number(l.discount || 0),
          taxId: l.taxId || l.tax?.id || null,
          taxRate: l.tax ? (Number(l.tax.amount) || 0) / 100 : 0,
          taxName: l.tax?.name || (l.tax?.amount ? `${l.tax.amount}%` : null),
        }))
      : [
          {
            id: `line-0-${Date.now()}`,
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

  // Populate helper for loading existing order
  const populateFields = orderData => {
    if (!orderData) return;
    if (orderData.type || orderData.orderType) {
      setOrderType(orderData.type || orderData.orderType);
    }
    if (orderData.division) {
      setDivision({ value: orderData.division.id, label: orderData.division.name });
    }
    if (orderData.customer || orderData.customerRecord) {
      const custLabel =
        typeof orderData.customer === 'string'
          ? orderData.customer
          : orderData.customer?.name || orderData.customerRecord?.name;
      const custId =
        orderData.customerId ||
        orderData.customerRecord?.id ||
        (typeof orderData.customer === 'object' ? orderData.customer?.id : null);
      const custRec =
        orderData.customerRecord ||
        (typeof orderData.customer === 'object' ? orderData.customer : null);
      setCustomer({
        value: custId,
        label: custLabel || 'Customer',
        record: custRec,
      });
    }
    if (orderData.deliveryAddress || orderData.shippingAddress) {
      setDeliveryAddress(orderData.deliveryAddress || orderData.shippingAddress || '');
    }
    if (orderData.poRefNo || orderData.clientRef) {
      setPoRefNo(orderData.poRefNo || orderData.clientRef || '');
    }
    if (orderData.clientPoDate) {
      setClientPoDate(new Date(orderData.clientPoDate));
    }
    if (orderData.orderDate || orderData.date) {
      setOrderDate(new Date(orderData.orderDate || orderData.date));
    }
    if (orderData.deliveryDays !== undefined && orderData.deliveryDays !== null) {
      setDeliveryDays(String(orderData.deliveryDays));
    }
    if (orderData.warehouse) {
      setWarehouse({ value: orderData.warehouse.id, label: orderData.warehouse.name });
    }
    if (orderData.pricelist) {
      setPricelist({ value: orderData.pricelist.id, label: orderData.pricelist.name });
    }
    if (orderData.paymentTerm) {
      setPaymentTerm({ value: orderData.paymentTerm.id, label: orderData.paymentTerm.name });
    }
    if (orderData.transporter) {
      setTransporter({ value: orderData.transporter.id, label: orderData.transporter.name });
    }
    if (orderData.transporterName) {
      setTransporterName(orderData.transporterName);
    }
    if (orderData.note || orderData.notes) {
      setNotes(orderData.note || orderData.notes);
    }
    if (Array.isArray(orderData.lines) && orderData.lines.length > 0) {
      setLines(
        orderData.lines.map((l, idx) => ({
          id: l.id || `line-${idx}-${Date.now()}`,
          productId: l.productId || l.product?.id,
          productName: l.productName || l.product?.name || l.description || 'Product',
          quantity: Number(l.quantity || 1),
          unitPrice: Number(l.unitPrice || 0),
          discount: Number(l.discount || 0),
          taxId: l.taxId || l.tax?.id || null,
          taxRate: l.tax ? (Number(l.tax.amount) || 0) / 100 : 0,
          taxName: l.tax?.name || (l.tax?.amount ? `${l.tax.amount}%` : null),
        })),
      );
    }
  };

  // Fetch full order if in edit mode
  useEffect(() => {
    if (!editOrderId) return;
    let isMounted = true;
    (async () => {
      try {
        setLoadingOrder(true);
        const data = await salesApi.getOrderDetail(editOrderId);
        if (isMounted && data) {
          setOrderInfo(data);
          populateFields(data);
        }
      } catch (err) {
        console.warn('Failed to load order for editing:', err);
      } finally {
        if (isMounted) setLoadingOrder(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [editOrderId]);

  // Pickers and Modals state
  const [pickerModal, setPickerModal] = useState({
    visible: false,
    title: '',
    relation: null,
    options: null,
    field: null,
    lineId: null,
  });

  const [datePickerState, setDatePickerState] = useState({
    visible: false,
    field: null, // 'orderDate' | 'clientPoDate'
  });

  const [saving, setSaving] = useState(false);

  useLayoutEffect(() => {
    const orderTitle =
      orderInfo?.soNumber ||
      orderInfo?.name ||
      initialOrder?.soNumber ||
      initialOrder?.name ||
      '';
    navigation.setOptions({
      title: isEditMode
        ? `Edit SO: ${orderTitle}`
        : 'Create Sale Order',
    });
  }, [navigation, isEditMode, orderInfo, initialOrder]);

  // Expected Delivery Date calculation
  const calculatedDeliveryDate = useMemo(() => {
    const days = parseInt(deliveryDays, 10);
    if (isNaN(days) || days <= 0) return orderDate;
    const d = new Date(orderDate);
    d.setDate(d.getDate() + days);
    return d;
  }, [orderDate, deliveryDays]);

  // Financial Calculations
  const calculations = useMemo(() => {
    let untaxedTotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;

    const computedLines = lines.map(line => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.unitPrice) || 0;
      const discPct = Number(line.discount) || 0;
      const rate = Number(line.taxRate) || 0;

      const base = qty * price;
      const discAmt = base * (discPct / 100);
      const taxable = Math.max(0, base - discAmt);
      const taxAmt = taxable * rate;
      const total = taxable + taxAmt;

      untaxedTotal += taxable;
      discountTotal += discAmt;
      taxTotal += taxAmt;

      return {
        ...line,
        discAmt,
        taxable,
        taxAmt,
        total,
      };
    });

    const grandTotal = untaxedTotal + taxTotal;

    return {
      computedLines,
      untaxedTotal: Math.round(untaxedTotal * 100) / 100,
      discountTotal: Math.round(discountTotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    };
  }, [lines]);

  // Handle Customer Selection & Auto Delivery Address
  const handleSelectCustomer = item => {
    setCustomer(item);
    const rec = item.record;
    if (rec) {
      const parts = [
        rec.street,
        rec.street2,
        rec.city,
        rec.state,
        rec.zip,
        rec.country,
      ].filter(Boolean);
      const autoAddress = parts.join(', ');
      setDeliveryAddress(autoAddress || rec.name || '');

      // Auto select customer default payment term if available
      if (rec.paymentTerm && !paymentTerm) {
        setPaymentTerm({
          value: rec.paymentTerm.id,
          label: rec.paymentTerm.name,
        });
      }
      // Auto select default warehouse if available
      if (rec.warehouse && !warehouse) {
        setWarehouse({
          value: rec.warehouse.id,
          label: rec.warehouse.name,
        });
      }
    }
  };

  // Unified Picker Select Handler
  const handlePickerSelect = item => {
    const { field, lineId } = pickerModal;
    if (field === 'division') {
      setDivision(item);
    } else if (field === 'customer') {
      handleSelectCustomer(item);
    } else if (field === 'warehouse') {
      setWarehouse(item);
    } else if (field === 'pricelist') {
      setPricelist(item);
    } else if (field === 'paymentTerm') {
      setPaymentTerm(item);
    } else if (field === 'transporter') {
      setTransporter(item);
      setTransporterName(item.label);
    } else if (field === 'lineProduct') {
      const rec = item.record;
      const salesPrice = Number(rec?.salesPrice || rec?.costPrice || 0);

      // Check if product has default tax
      let defaultTaxId = null;
      let defaultTaxRate = 0;
      let defaultTaxName = null;
      if (Array.isArray(rec?.salesTaxes) && rec.salesTaxes.length > 0) {
        const t = rec.salesTaxes[0];
        defaultTaxId = t.id;
        defaultTaxRate = (Number(t.amount) || 0) / 100;
        defaultTaxName = t.name || `${t.amount}%`;
      }

      setLines(prev =>
        prev.map(l =>
          l.id === lineId
            ? {
                ...l,
                productId: item.value,
                productName: item.label,
                unitPrice: salesPrice,
                taxId: defaultTaxId || l.taxId,
                taxRate: defaultTaxRate || l.taxRate,
                taxName: defaultTaxName || l.taxName,
              }
            : l,
        ),
      );
    } else if (field === 'lineTax') {
      const rec = item.record;
      const amount = Number(rec?.amount) || 0;
      const rate =
        rec?.amountType === 'percent' || !rec?.amountType ? amount / 100 : 0;
      setLines(prev =>
        prev.map(l =>
          l.id === lineId
            ? {
                ...l,
                taxId: item.value,
                taxRate: rate,
                taxName: rec?.name || `${amount}%`,
              }
            : l,
        ),
      );
    }
    setPickerModal(p => ({ ...p, visible: false }));
  };

  // Add new order line
  const handleAddLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: `line-${prev.length}-${Date.now()}`,
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

  // Remove line
  const handleRemoveLine = lineId => {
    if (lines.length <= 1) {
      Alert.alert('Notice', 'A sale order must contain at least one line item.');
      return;
    }
    setLines(prev => prev.filter(l => l.id !== lineId));
  };

  // Update line field
  const handleLineChange = (lineId, key, value) => {
    setLines(prev =>
      prev.map(l => (l.id === lineId ? { ...l, [key]: value } : l)),
    );
  };

  // Clear line tax
  const handleClearTax = lineId => {
    setLines(prev =>
      prev.map(l =>
        l.id === lineId
          ? { ...l, taxId: null, taxRate: 0, taxName: null }
          : l,
      ),
    );
  };

  // Validation
  const validateForm = () => {
    if (!division) {
      Alert.alert('Validation Error', 'Please select a Division.');
      return false;
    }
    if (!customer) {
      Alert.alert('Validation Error', 'Please select a Customer.');
      return false;
    }
    if (!warehouse) {
      Alert.alert('Validation Error', 'Please select a Warehouse.');
      return false;
    }
    const hasValidLine = lines.some(
      l => l.productId && Number(l.quantity) > 0,
    );
    if (!hasValidLine) {
      Alert.alert(
        'Validation Error',
        'Please add at least one product with quantity > 0.',
      );
      return false;
    }
    return true;
  };

  // Submit Handler
  const handleSubmit = async (sendForApprovalImmediately = false) => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const payload = {
        divisionId: division.value,
        customerId: customer.value,
        deliveryAddress: deliveryAddress.trim() || undefined,
        poRefNo: poRefNo.trim() || undefined,
        clientPoDate: clientPoDate ? clientPoDate.toISOString() : undefined,
        orderDate: orderDate.toISOString(),
        warehouseId: warehouse.value,
        pricelistId: pricelist?.value || undefined,
        paymentTermId: paymentTerm?.value || undefined,
        orderType,
        transporterId: transporter?.value || undefined,
        transporterName: transporterName.trim() || undefined,
        deliveryDays: parseInt(deliveryDays, 10) || 0,
        deliveryDate: calculatedDeliveryDate.toISOString(),
        note: notes.trim() || undefined,
        lines: lines
          .filter(l => l.productId)
          .map(l => ({
            productId: l.productId,
            description: l.productName,
            quantity: Number(l.quantity) || 1,
            unitPrice: Number(l.unitPrice) || 0,
            discount: Number(l.discount) || 0,
            taxId: l.taxId || undefined,
          })),
      };

      if (isEditMode) {
        const res = await salesApi.updateOrder(editOrderId, payload);

        if (sendForApprovalImmediately) {
          await salesApi.sendForApproval(editOrderId);
        }

        Alert.alert(
          'Updated Successfully',
          `Sales Order ${res?.name || orderInfo?.soNumber || orderInfo?.name || ''} updated successfully ${
            sendForApprovalImmediately
              ? 'and sent for management approval!'
              : '!'
          }`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ],
        );
      } else {
        const res = await salesApi.createOrder(payload);

        if (sendForApprovalImmediately && res?.id) {
          await salesApi.sendForApproval(res.id);
        }

        Alert.alert(
          'Success',
          `Sales Order ${res?.name || ''} created successfully ${
            sendForApprovalImmediately
              ? 'and sent for management approval!'
              : 'as Draft Quotation!'
          }`,
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate(navigationScreen.SALES_ORDERS_LIST);
              },
            },
          ],
        );
      }
    } catch (err) {
      Alert.alert(
        isEditMode ? 'Update Failed' : 'Creation Failed',
        err?.response?.data?.message || err?.message || 'Failed to save sales order',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingOrder) {
    return (
      <ScreenContainer>
        <View style={styles.centerLoadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerLoadingText}>
            Loading Sales Order Details...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Top Header Card */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardHeaderTitle}>SALE ORDER TYPE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeRow}>
            {ORDER_TYPES.map(t => {
              const isActive = orderType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typePill, isActive && styles.typePillActive]}
                  onPress={() => setOrderType(t.key)}
                  activeOpacity={0.7}>
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text
                    style={[
                      styles.typePillText,
                      isActive && styles.typePillTextActive,
                    ]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Master Details Card */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardHeaderTitle}>CUSTOMER & GENERAL DETAILS</Text>

          {/* Division & Warehouse */}
          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>
                Division <Text style={styles.req}>*</Text>
              </Text>
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
                <Text
                  style={
                    division
                      ? styles.pickerValueText
                      : styles.pickerPlaceholderText
                  }
                  numberOfLines={1}>
                  🏭 {division?.label || 'Select Division'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>
                Warehouse <Text style={styles.req}>*</Text>
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
                <Text
                  style={
                    warehouse
                      ? styles.pickerValueText
                      : styles.pickerPlaceholderText
                  }
                  numberOfLines={1}>
                  📍 {warehouse?.label || 'Select Warehouse'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Customer Selection */}
          <Text style={styles.inputLabel}>
            Customer <Text style={styles.req}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() =>
              setPickerModal({
                visible: true,
                title: 'Select Customer',
                relation: 'partners',
                field: 'customer',
              })
            }>
            <Text
              style={
                customer
                  ? styles.pickerValueText
                  : styles.pickerPlaceholderText
              }
              numberOfLines={1}>
              🏢 {customer?.label || 'Search & Select Customer...'}
            </Text>
          </TouchableOpacity>

          {/* Auto Delivery Address (Editable) */}
          <Text style={styles.inputLabel}>
            Delivery Address (Auto-filled)
          </Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            placeholder="Delivery address will be auto-populated here..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={2}
          />

          {/* PO Ref No & Client PO Date */}
          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>PO Ref No (Client)</Text>
              <TextInput
                style={styles.textInput}
                value={poRefNo}
                onChangeText={setPoRefNo}
                placeholder="e.g. PO/2026/XYZ"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>Client PO Date</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() =>
                  setDatePickerState({ visible: true, field: 'clientPoDate' })
                }>
                <Text
                  style={
                    clientPoDate
                      ? styles.pickerValueText
                      : styles.pickerPlaceholderText
                  }>
                  📅 {clientPoDate ? formatDate(clientPoDate) : 'DD/MM/YYYY'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Today / Order Date & Delivery Days */}
          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Today Date (Order Date)</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() =>
                  setDatePickerState({ visible: true, field: 'orderDate' })
                }>
                <Text style={styles.pickerValueText}>
                  📅 {formatDate(orderDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>Delivery Days</Text>
              <TextInput
                style={styles.textInput}
                value={deliveryDays}
                onChangeText={setDeliveryDays}
                keyboardType="numeric"
                placeholder="e.g. 7"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Calculated Expected Delivery Date Banner */}
          <View style={styles.deliveryDateBanner}>
            <Text style={styles.deliveryDateBannerText}>
              🗓️ Expected Delivery Date:{' '}
              <Text style={{ fontWeight: '800', color: colors.primary }}>
                {formatDate(calculatedDeliveryDate)}
              </Text>{' '}
              ({deliveryDays || 0} days from order)
            </Text>
          </View>

          {/* Pricelist & Payment Term */}
          <View style={styles.twoColRow}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Pricelist</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() =>
                  setPickerModal({
                    visible: true,
                    title: 'Select Pricelist',
                    relation: 'pricelists',
                    field: 'pricelist',
                  })
                }>
                <Text
                  style={
                    pricelist
                      ? styles.pickerValueText
                      : styles.pickerPlaceholderText
                  }
                  numberOfLines={1}>
                  🏷️ {pricelist?.label || 'Default Pricelist'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.col}>
              <Text style={styles.inputLabel}>Payment Term</Text>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() =>
                  setPickerModal({
                    visible: true,
                    title: 'Select Payment Term',
                    relation: 'payment-terms',
                    field: 'paymentTerm',
                  })
                }>
                <Text
                  style={
                    paymentTerm
                      ? styles.pickerValueText
                      : styles.pickerPlaceholderText
                  }
                  numberOfLines={1}>
                  💳 {paymentTerm?.label || 'Immediate Payment'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Transporter */}
          <Text style={styles.inputLabel}>Transporter / Shipping Carrier</Text>
          <View style={styles.twoColRow}>
            <View style={{ flex: 1, marginRight: spacing.xs }}>
              <TouchableOpacity
                style={styles.pickerTrigger}
                onPress={() =>
                  setPickerModal({
                    visible: true,
                    title: 'Select Transporter Partner',
                    relation: 'partners',
                    field: 'transporter',
                  })
                }>
                <Text
                  style={
                    transporter
                      ? styles.pickerValueText
                      : styles.pickerPlaceholderText
                  }
                  numberOfLines={1}>
                  🚚 {transporter?.label || 'Select Carrier...'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.xs }}>
              <TextInput
                style={styles.textInput}
                value={transporterName}
                onChangeText={setTransporterName}
                placeholder="Or type transporter name..."
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>
        </View>

        {/* Order Lines Card */}
        <View style={[styles.card, shadows.sm]}>
          <View style={styles.lineHeaderRow}>
            <View>
              <Text style={styles.cardHeaderTitle}>ORDER LINE ITEMS</Text>
              <Text style={styles.cardHeaderSub}>
                {lines.length} {lines.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.btnAddLine}
              onPress={handleAddLine}
              activeOpacity={0.7}>
              <Text style={styles.btnAddLineText}>+ Add Product</Text>
            </TouchableOpacity>
          </View>

          {calculations.computedLines.map((line, index) => (
            <View key={line.id} style={styles.lineCard}>
              <View style={styles.lineTopRow}>
                <Text style={styles.lineIndexBadge}>#{index + 1}</Text>
                <TouchableOpacity
                  style={styles.lineProductSelector}
                  onPress={() =>
                    setPickerModal({
                      visible: true,
                      title: 'Select Product',
                      relation: 'products',
                      field: 'lineProduct',
                      lineId: line.id,
                    })
                  }>
                  <Text
                    style={
                      line.productName
                        ? styles.lineProductName
                        : styles.lineProductPlaceholder
                    }
                    numberOfLines={1}>
                    📦 {line.productName || 'Select Product...'}
                  </Text>
                </TouchableOpacity>

                {lines.length > 1 && (
                  <TouchableOpacity
                    style={styles.btnDeleteLine}
                    onPress={() => handleRemoveLine(line.id)}>
                    <Text style={styles.btnDeleteLineText}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Line Inputs Grid */}
              <View style={styles.lineInputsGrid}>
                {/* Quantity */}
                <View style={styles.lineInputBox}>
                  <Text style={styles.lineInputLabel}>Qty</Text>
                  <TextInput
                    style={styles.lineTextInput}
                    value={String(line.quantity)}
                    onChangeText={val =>
                      handleLineChange(line.id, 'quantity', val)
                    }
                    keyboardType="numeric"
                  />
                </View>

                {/* Unit Price */}
                <View style={styles.lineInputBox}>
                  <Text style={styles.lineInputLabel}>Unit Price (₹)</Text>
                  <TextInput
                    style={styles.lineTextInput}
                    value={String(line.unitPrice)}
                    onChangeText={val =>
                      handleLineChange(line.id, 'unitPrice', val)
                    }
                    keyboardType="numeric"
                  />
                </View>

                {/* Discount % */}
                <View style={styles.lineInputBox}>
                  <Text style={styles.lineInputLabel}>Disc %</Text>
                  <TextInput
                    style={styles.lineTextInput}
                    value={String(line.discount)}
                    onChangeText={val =>
                      handleLineChange(line.id, 'discount', val)
                    }
                    keyboardType="numeric"
                  />
                </View>

                {/* Taxes Selector */}
                <View style={[styles.lineInputBox, { flex: 1.4 }]}>
                  <Text style={styles.lineInputLabel}>Taxes</Text>
                  <View style={styles.taxPillWrap}>
                    <TouchableOpacity
                      style={styles.taxPill}
                      onPress={() =>
                        setPickerModal({
                          visible: true,
                          title: 'Select Tax',
                          relation: 'taxes',
                          field: 'lineTax',
                          lineId: line.id,
                        })
                      }>
                      <Text style={styles.taxPillText} numberOfLines={1}>
                        {line.taxName || 'None'}
                      </Text>
                    </TouchableOpacity>
                    {line.taxId && (
                      <TouchableOpacity
                        style={styles.taxClearBtn}
                        onPress={() => handleClearTax(line.id)}>
                        <Text style={styles.taxClearText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Line Subtotal Footer */}
              <View style={styles.lineFooterRow}>
                <Text style={styles.lineSubText}>
                  Net: ₹{line.taxable.toFixed(2)} + Tax: ₹
                  {line.taxAmt.toFixed(2)}
                </Text>
                <Text style={styles.lineTotalText}>
                  Total: ₹{line.total.toFixed(2)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Financial Summary Card */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardHeaderTitle}>FINANCIAL SUMMARY</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Untaxed Subtotal</Text>
            <Text style={styles.summaryVal}>
              ₹
              {calculations.untaxedTotal.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>

          {calculations.discountTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#059669' }]}>
                Total Discount
              </Text>
              <Text style={[styles.summaryVal, { color: '#059669' }]}>
                -₹
                {calculations.discountTotal.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Taxes (GST)</Text>
            <Text style={styles.summaryVal}>
              ₹
              {calculations.taxTotal.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>
              ₹
              {calculations.grandTotal.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Notes */}
        <View style={[styles.card, shadows.sm]}>
          <Text style={styles.cardHeaderTitle}>ORDER NOTES & TERMS</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add payment terms, delivery notes, or special customer instructions..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.btnDraft}
            onPress={() => handleSubmit(false)}
            disabled={saving}
            activeOpacity={0.8}>
            <Text style={styles.btnDraftText}>
              {saving
                ? 'Saving...'
                : isEditMode
                ? '💾 Update Sale Order'
                : '💾 Save as Draft'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnConfirm}
            onPress={() => handleSubmit(true)}
            disabled={saving}
            activeOpacity={0.8}>
            <Text style={styles.btnConfirmText}>
              {saving
                ? 'Processing...'
                : isEditMode
                ? '📤 Update & Send for Approval →'
                : '📤 Save & Send for Approval →'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Relations Picker Modal */}
      <PickerModal
        visible={pickerModal.visible}
        title={pickerModal.title}
        relation={pickerModal.relation}
        options={pickerModal.options}
        onSelect={handlePickerSelect}
        onClose={() => setPickerModal(p => ({ ...p, visible: false }))}
      />

      {/* Date Picker Modal */}
      <DateTimePickerModal
        isVisible={datePickerState.visible}
        mode="date"
        date={
          datePickerState.field === 'clientPoDate'
            ? clientPoDate || new Date()
            : orderDate
        }
        onConfirm={d => {
          if (datePickerState.field === 'clientPoDate') {
            setClientPoDate(d);
          } else {
            setOrderDate(d);
          }
          setDatePickerState({ visible: false, field: null });
        }}
        onCancel={() => setDatePickerState({ visible: false, field: null })}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderTitle: {
    ...typography.captionBold,
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  cardHeaderSub: {
    ...typography.tiny,
    color: '#94A3B8',
  },
  typeRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeIcon: {
    fontSize: 13,
  },
  typePillText: {
    ...typography.captionBold,
    color: '#475569',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  col: {
    flex: 1,
  },
  inputLabel: {
    ...typography.captionBold,
    color: '#334155',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  req: {
    color: '#EF4444',
  },
  pickerTrigger: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  pickerValueText: {
    ...typography.body,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  pickerPlaceholderText: {
    ...typography.body,
    fontSize: 13,
    color: '#94A3B8',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  multilineInput: {
    minHeight: 52,
    textAlignVertical: 'top',
  },
  deliveryDateBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  deliveryDateBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
  },
  lineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  btnAddLine: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  btnAddLineText: {
    ...typography.captionBold,
    color: colors.primary,
  },
  lineCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.sm,
  },
  lineTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.xs,
  },
  lineIndexBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  lineProductSelector: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.xs,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  lineProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  lineProductPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
  },
  btnDeleteLine: {
    padding: 6,
  },
  btnDeleteLineText: {
    fontSize: 16,
  },
  lineInputsGrid: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  lineInputBox: {
    flex: 1,
  },
  lineInputLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  lineTextInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  taxPillWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taxPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.xs,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  taxPillText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  taxClearBtn: {
    paddingHorizontal: 4,
  },
  taxClearText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },
  lineFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  lineSubText: {
    fontSize: 11,
    color: '#64748B',
  },
  lineTotalText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    ...typography.body,
    fontSize: 13,
    color: '#64748B',
  },
  summaryVal: {
    ...typography.bodyBold,
    fontSize: 13,
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.xs,
  },
  grandTotalLabel: {
    ...typography.h3,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
  },
  grandTotalVal: {
    ...typography.h3,
    fontSize: 17,
    color: colors.primary,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btnDraft: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDraftText: {
    ...typography.captionBold,
    color: '#475569',
    fontSize: 13,
  },
  centerLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  centerLoadingText: {
    ...typography.caption,
    color: '#64748B',
    marginTop: spacing.sm,
    fontSize: 14,
  },
  btnConfirm: {
    flex: 1.2,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnConfirmText: {
    ...typography.captionBold,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});


import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import InventoryMenuScreen from '../screens/inventory/InventoryMenuScreen';
import EntityListScreen from '../screens/inventory/EntityListScreen';
import EntityFormScreen from '../screens/inventory/EntityFormScreen';
import ComingSoonScreen from '../screens/common/ComingSoonScreen';
import StockQuantsScreen from '../screens/operations/StockQuantsScreen';
import PickingListScreen from '../screens/operations/PickingListScreen';
import PickingFormScreen from '../screens/operations/PickingFormScreen';
import PickingDetailScreen from '../screens/operations/PickingDetailScreen';
import InventoryAdjustmentListScreen from '../screens/operations/InventoryAdjustmentListScreen';
import InventoryAdjustmentFormScreen from '../screens/operations/InventoryAdjustmentFormScreen';
import InventoryAdjustmentDetailScreen from '../screens/operations/InventoryAdjustmentDetailScreen';
import StockValuationScreen from '../screens/operations/StockValuationScreen';
import { useSideMenu } from './SideMenu';
import { colors, radius, spacing } from '../theme/theme';
import Settings from '../screens/settings/settings';
import PurchaseOrder from '../screens/purchase/PurchaseOrder';
import Purchasedeshboard from '../screens/purchase/Purchasedeshboard';
import { navigationScreen } from './navigationScreen/navigationScreen';
import PurchaseOrderform from '../screens/purchase/PurchaseOrderform';
import Venderbills from '../screens/purchase/Venderbills';
import VendorBillDetailScreen from '../screens/purchase/VendorBillDetailScreen';
import VoucherScreen from '../screens/purchase/VoucherScreen';
import AccountingMenuScreen from '../screens/accounting/AccountingMenuScreen';
import ChartOfAccountsScreen from '../screens/accounting/ChartOfAccountsScreen';
import SalesMenuScreen from '../screens/sales/SalesMenuScreen';
import SalesOrdersListScreen from '../screens/sales/SalesOrdersListScreen';
import SalesOrderDetailScreen from '../screens/sales/SalesOrderDetailScreen';
import SalesOrderFormScreen from '../screens/sales/SalesOrderFormScreen';
import UsersListScreen from '../screens/settings/UsersListScreen';
import UserFormScreen from '../screens/settings/UserFormScreen';

const Stack = createNativeStackNavigator();

function MenuButton() {
  const sideMenu = useSideMenu();
  return (
    <TouchableOpacity
      onPress={() => sideMenu?.openDrawer()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Open side menu"
      style={styles.menuBtn}>
      <View style={styles.menuBar} />
      <View style={[styles.menuBar, styles.menuBarMiddle]} />
      <View style={styles.menuBar} />
    </TouchableOpacity>
  );
}

const renderMenuButton = () => <MenuButton />;

const sharedHeaderStyle = {
  headerStyle: { backgroundColor: colors.ink },
  headerTintColor: colors.onInk,
  headerTitleStyle: { fontWeight: '700', fontSize: 17 },
  headerShadowVisible: false,
};

export default function MainStackNavigator() {
  return (
    <Stack.Navigator screenOptions={sharedHeaderStyle}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          headerLeft: renderMenuButton,
        }}
      />
      <Stack.Screen
        name="InventoryMenu"
        component={InventoryMenuScreen}
        options={{ title: 'Inventory' }}
      />
      <Stack.Screen name="EntityList" component={EntityListScreen} />
      <Stack.Screen
        name="EntityForm"
        component={EntityFormScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={({ route }) => ({ title: route.params?.title ?? 'Coming Soon' })}
      />

      {/* Sales */}
      <Stack.Screen
        name="SalesMenu"
        component={SalesMenuScreen}
        options={{ title: 'Sales' }}
      />
      <Stack.Screen
        name="SalesOrdersList"
        component={SalesOrdersListScreen}
        options={{ title: 'Sales Orders (SO)' }}
      />
      <Stack.Screen
        name="SalesOrderForm"
        component={SalesOrderFormScreen}
        options={{ title: 'New Sales Order' }}
      />
      <Stack.Screen
        name="SalesOrderDetail"
        component={SalesOrderDetailScreen}
        options={({ route }) => ({ title: route.params?.title || 'Sales Order' })}
      />

      {/* Inventory operations */}
      <Stack.Screen
        name="StockQuants"
        component={StockQuantsScreen}
        options={{ title: 'Stock On Hand' }}
      />
      <Stack.Screen name="PickingList" component={PickingListScreen} />
      <Stack.Screen
        name="PickingForm"
        component={PickingFormScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="PickingDetail"
        component={PickingDetailScreen}
        options={{ title: 'Transfer' }}
      />
      <Stack.Screen
        name="InventoryAdjustmentList"
        component={InventoryAdjustmentListScreen}
      />
      <Stack.Screen
        name="InventoryAdjustmentForm"
        component={InventoryAdjustmentFormScreen}
        options={{ presentation: 'modal', title: 'New Stock Adjustment' }}
      />
      <Stack.Screen
        name="InventoryAdjustmentDetail"
        component={InventoryAdjustmentDetailScreen}
        options={{ title: 'Inventory Adjustment' }}
      />
      <Stack.Screen
        name="StockValuation"
        component={StockValuationScreen}
        options={{ title: 'Inventory Valuation' }}
      />
      <Stack.Screen
        name="Settings"
        component={Settings}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen
        name="UsersList"
        component={UsersListScreen}
        options={{ title: 'Users & Access' }}
      />
      <Stack.Screen
        name="UserForm"
        component={UserFormScreen}
        options={({ route }) => ({
          title: route.params?.user ? 'Edit User' : 'New User',
        })}
      />
      <Stack.Screen
        name="PurchaseOrder"
        component={PurchaseOrder}
        options={{ title: 'Purchase Order' }}
      />
      <Stack.Screen
        name="Purchasedashboard"
        component={Purchasedeshboard}
        options={{ title: 'Purchase Dashboard' }}
      />
      <Stack.Screen
        name={navigationScreen.PURCHASE_ORDER_FORM}
        component={PurchaseOrderform}
        options={{ title: 'Purchase Order Form' }}
      />
      <Stack.Screen
        name={navigationScreen.ACCOUNTING_MENU}
        component={AccountingMenuScreen}
        options={{ title: 'Invoicing & Accounting' }}
      />
      <Stack.Screen
        name={navigationScreen.VENDORS_BILLS}
        component={Venderbills}
        options={{ title: 'Vendor Bills' }}
      />
      <Stack.Screen
        name={navigationScreen.VENDOR_BILL_DETAIL}
        component={VendorBillDetailScreen}
        options={{ title: 'Vendor Bill' }}
      />
      <Stack.Screen
        name={navigationScreen.VOUCHER}
        component={VoucherScreen}
        options={{ title: 'Accounting Voucher' }}
      />
      <Stack.Screen
        name={navigationScreen.CHART_OF_ACCOUNTS}
        component={ChartOfAccountsScreen}
        options={{ title: 'Chart of Accounts' }}
      />
     
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  menuBar: {
    width: 18,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.onInk,
    marginVertical: 2,
  },
  menuBarMiddle: {
    width: 14,
  },
});

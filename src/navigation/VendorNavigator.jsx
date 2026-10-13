import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import VendorDashboardScreen from '../screens/vendor/VendorDashboardScreen';
import VendorOrdersScreen from '../screens/vendor/VendorOrdersScreen';
import VendorOrderDetailScreen from '../screens/vendor/VendorOrderDetailScreen';
import VendorBillsScreen from '../screens/vendor/VendorBillsScreen';
import VendorProfileScreen from '../screens/vendor/VendorProfileScreen';

const Stack = createNativeStackNavigator();

export default function VendorNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="VendorDashboard"
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
      <Stack.Screen name="VendorOrders" component={VendorOrdersScreen} />
      <Stack.Screen
        name="VendorOrderDetail"
        component={VendorOrderDetailScreen}
      />
      <Stack.Screen name="VendorBills" component={VendorBillsScreen} />
      <Stack.Screen name="VendorProfile" component={VendorProfileScreen} />
    </Stack.Navigator>
  );
}


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import MainStackNavigator from './MainStackNavigator';
import SideMenu from './SideMenu';
import SideMenuContent from './SideMenuContent';
import { navigationRef } from './navigationRef';
import { useAuth } from '../context/AuthContext';
import { LoadingOverlay } from '../components/Feedback';
import ScreenContainer from '../components/ScreenContainer';
import VendorNavigator from './VendorNavigator';

const AuthStack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <ScreenContainer edges={['top', 'left', 'right', 'bottom']}>
        <LoadingOverlay label="Starting up..." />
      </ScreenContainer>
    );
  }

  const isVendor =
    user?.isVendor ||
    user?.role === 'vendor' ||
    user?.role?.name === 'vendor' ||
    !!user?.partnerId;

  return (
    <NavigationContainer ref={navigationRef}>
      {user ? (
        isVendor ? (
          <VendorNavigator />
        ) : (
          <SideMenu renderContent={({ closeDrawer }) => <SideMenuContent closeDrawer={closeDrawer} />}>
            <MainStackNavigator />
          </SideMenu>
        )
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}


import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Main App Screens
import MainTabNavigator from './MainTabNavigator';
import VendorDetailsScreen from '../screens/vendor/VendorDetailsScreen';
import ServiceDetailsScreen from '../screens/service/ServiceDetailsScreen';
import BookingScreen from '../screens/booking/BookingScreen';
import PaymentScreen from '../screens/payment/PaymentScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';

// Types
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Auth" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="VendorDetails" component={VendorDetailsScreen} />
            <Stack.Screen name="ServiceDetails" component={ServiceDetailsScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;


import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Components
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

// Store
import { login, clearError } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store';

// Types
import { RootStackParamList } from '../../types';

// Theme
import { theme } from '../../utils/theme';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Auth'>;

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  
  const { isLoading, error } = useSelector((state: RootState) => state.auth);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateForm = (): boolean => {
    const errors = {
      email: '',
      password: '',
    };

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(login(formData)).unwrap();
      // Navigation will be handled automatically by the AppNavigator
    } catch (error) {
      // Error is already handled in the useEffect
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (formErrors[field as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={60} color={theme.colors.primary} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your wedding planning account</Text>
        </View>

        <View style={styles.formContainer}>
          <Input
            label="Email"
            placeholder="Enter your email"
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            type="email"
            leftIcon="mail-outline"
            error={formErrors.email}
            required
            autoCapitalize="none"
          />

          <Input
            label="Password"
            placeholder="Enter your password"
            value={formData.password}
            onChangeText={(text) => handleInputChange('password', text)}
            type="password"
            leftIcon="lock-closed-outline"
            error={formErrors.password}
            required
          />

          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={navigateToForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={isLoading}
            fullWidth
            style={styles.loginButton}
          />

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <Button
            title="Continue with Google"
            onPress={() => Alert.alert('Coming Soon', 'Google sign-in will be available soon!')}
            variant="outline"
            fullWidth
            style={styles.googleButton}
          />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={styles.signUpText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xxl * 2,
    marginBottom: theme.spacing.xxl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    flex: 1,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '500',
  },
  loginButton: {
    marginBottom: theme.spacing.lg,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '500',
  },
  googleButton: {
    marginBottom: theme.spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxl,
  },
  footerText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
  },
  signUpText: {
    color: theme.colors.primary,
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
  },
});

export default LoginScreen;


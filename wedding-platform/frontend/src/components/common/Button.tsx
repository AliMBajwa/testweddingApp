import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../../utils/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    };

    // Size styles
    const sizeStyles = {
      small: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        minHeight: 36,
      },
      medium: {
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.lg,
        minHeight: 48,
      },
      large: {
        paddingVertical: theme.spacing.lg,
        paddingHorizontal: theme.spacing.xl,
        minHeight: 56,
      },
    };

    // Variant styles
    const variantStyles = {
      primary: {
        backgroundColor: theme.colors.primary,
        borderWidth: 0,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
        borderWidth: 0,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
      },
    };

    // Width style
    const widthStyle = fullWidth ? { width: '100%' } : {};

    // Disabled style
    const disabledStyle = disabled || loading ? { opacity: 0.6 } : {};

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...widthStyle,
      ...disabledStyle,
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    // Size text styles
    const sizeTextStyles = {
      small: {
        fontSize: 14,
      },
      medium: {
        fontSize: 16,
      },
      large: {
        fontSize: 18,
      },
    };

    // Variant text styles
    const variantTextStyles = {
      primary: {
        color: theme.colors.background,
      },
      secondary: {
        color: theme.colors.text,
      },
      outline: {
        color: theme.colors.primary,
      },
      ghost: {
        color: theme.colors.primary,
      },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? theme.colors.background : theme.colors.primary}
          style={{ marginRight: theme.spacing.sm }}
        />
      )}
      <Text style={getTextStyle()}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Additional styles can be added here if needed
});

export default Button;


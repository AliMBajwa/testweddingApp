import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'phone';
  error?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
}

const Input: React.FC<InputProps> = ({
  label,
  placeholder,
  value,
  onChangeText,
  type = 'text',
  error,
  required = false,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  maxLength,
  style,
  inputStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getInputType = () => {
    if (type === 'password') {
      return showPassword ? 'text' : 'password';
    }
    if (type === 'number') {
      return 'numeric';
    }
    if (type === 'email') {
      return 'email-address';
    }
    if (type === 'phone') {
      return 'phone-pad';
    }
    return 'default';
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const getRightIcon = () => {
    if (type === 'password') {
      return showPassword ? 'eye-off' : 'eye';
    }
    return rightIcon;
  };

  const handleRightIconPress = () => {
    if (type === 'password') {
      togglePasswordVisibility();
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>
            {label}
            {required && <Text style={styles.required}> *</Text>}
          </Text>
        </View>
      )}
      
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          error && styles.inputContainerError,
          disabled && styles.inputContainerDisabled,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={theme.colors.textSecondary}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          style={[
            styles.input,
            inputStyle,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            multiline && styles.inputMultiline,
          ]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={type === 'password' && !showPassword}
          keyboardType={getInputType()}
          editable={!disabled}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          autoCorrect={type === 'email' ? false : true}
        />
        
        {(rightIcon || type === 'password') && (
          <TouchableOpacity
            style={styles.rightIconContainer}
            onPress={handleRightIconPress}
            disabled={disabled}
          >
            <Ionicons
              name={getRightIcon() as keyof typeof Ionicons.glyphMap}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  labelContainer: {
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
  },
  required: {
    color: theme.colors.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    minHeight: 48,
  },
  inputContainerFocused: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  inputContainerDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  leftIcon: {
    marginLeft: theme.spacing.md,
    marginRight: theme.spacing.sm,
  },
  rightIconContainer: {
    marginRight: theme.spacing.md,
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  errorText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
});

export default Input;


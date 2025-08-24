import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

const HomeScreen: React.FC = () => {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to Wedding Platform</Text>
        <Text style={styles.subtitleText}>
          Find the perfect vendors for your special day
        </Text>
      </View>

      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>What We Offer</Text>
        
        <View style={styles.featureGrid}>
          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="search" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureTitle}>Find Vendors</Text>
            <Text style={styles.featureDescription}>
              Discover trusted wedding professionals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="calendar" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureTitle}>Book Services</Text>
            <Text style={styles.featureDescription}>
              Secure your date with ease
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="star" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureTitle}>Read Reviews</Text>
            <Text style={styles.featureDescription}>
              Make informed decisions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featureCard}>
            <View style={styles.featureIcon}>
              <Ionicons name="card" size={32} color={theme.colors.primary} />
            </View>
            <Text style={styles.featureTitle}>Secure Payments</Text>
            <Text style={styles.featureDescription}>
              Safe and convenient transactions
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ctaContainer}>
        <Text style={styles.ctaTitle}>Ready to Start Planning?</Text>
        <Text style={styles.ctaDescription}>
          Browse our vendor directory and find the perfect match for your wedding
        </Text>
        <TouchableOpacity style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Explore Vendors</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.background} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.lg,
  },
  welcomeText: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitleText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.text,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  featureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureTitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  featureDescription: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  ctaContainer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    margin: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: 'bold',
    color: theme.colors.background,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  ctaDescription: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.background,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  ctaButtonText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.primary,
    marginRight: theme.spacing.sm,
  },
});

export default HomeScreen;


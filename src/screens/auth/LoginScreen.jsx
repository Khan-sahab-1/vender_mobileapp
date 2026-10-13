import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { colors, radius, spacing, shadows } from '../../theme/theme';

const COMPANY_TYPES = [
  { key: 'pvt_ltd', label: 'Pvt Ltd' },
  { key: 'llc', label: 'LLC' },
  { key: 'proprietorship', label: 'Proprietorship' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'other', label: 'Other' },
];

export default function LoginScreen() {
  const { login, signup } = useAuth();

  // Active top tab: 'signin' or 'signup'
  const [activeTab, setActiveTab] = useState('signin');

  // Sign In fields
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Company Specific fields
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('pvt_ltd');
  const [companyCode, setCompanyCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Address fields
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('India');
  const [zip, setZip] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!error) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [error, shakeAnim]);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(getErrorMessage(e) || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!companyName.trim()) {
      setError('Please enter your company name.');
      return;
    }
    if (!userName.trim()) {
      setError('Please enter admin full name.');
      return;
    }
    if (!userEmail.trim()) {
      setError('Please enter work email address.');
      return;
    }
    if (!userPassword || userPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signup({
        registrationType: 'company',
        name: userName.trim(),
        email: userEmail.trim(),
        password: userPassword,
        phone: userPhone.trim() || undefined,
        companyName: companyName.trim(),
        companyType,
        companyCode: companyCode.trim() || undefined,
        gstin: gstin.trim() || undefined,
        companyEmail: companyEmail.trim() || undefined,
        companyPhone: companyPhone.trim() || undefined,
        street: street.trim() || undefined,
        city: city.trim() || undefined,
        state: stateName.trim() || undefined,
        country: country.trim() || 'India',
        zip: zip.trim() || undefined,
      });
    } catch (e) {
      setError(getErrorMessage(e) || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header Branding */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🏢</Text>
            </View>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>MULTI-TENANT ERP CLOUD</Text>
            </View>
            <Text style={styles.appTitle}>Master Data ERP</Text>
            <Text style={styles.appSubtitle}>
              {activeTab === 'signin'
                ? 'Sign in to access your company inventory, products & master data.'
                : 'Register your company. Default warehouse, categories & units are set up automatically.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, shadows.md]}>
            {/* Top Tab: Sign In vs Register */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'signin' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('signin');
                  setError(null);
                }}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'signin' && styles.tabButtonTextActive,
                  ]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'signup' && styles.tabButtonActive]}
                onPress={() => {
                  setActiveTab('signup');
                  setError(null);
                }}
                activeOpacity={0.8}>
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'signup' && styles.tabButtonTextActive,
                  ]}>
                  Register Company
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error ? (
              <Animated.View
                style={[styles.errorBox, { transform: [{ translateX: shakeAnim }] }]}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </Animated.View>
            ) : null}

            {activeTab === 'signin' ? (
              /* ================= SIGN IN TAB ================= */
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      value={email}
                      onChangeText={(val) => {
                        setEmail(val);
                        if (error) setError(null);
                      }}
                      placeholder="admin@example.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                      editable={!loading}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      value={password}
                      onChangeText={(val) => {
                        setPassword(val);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      style={styles.textInput}
                      editable={!loading}
                      onSubmitEditing={handleSignIn}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}>
                      <Text style={styles.eyeBtnText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, loading && styles.btnDisabled]}
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.actionBtnText}> Signing in...</Text>
                    </View>
                  ) : (
                    <Text style={styles.actionBtnText}>Sign In ➔</Text>
                  )}
                </TouchableOpacity>

                {/* Quick Demo Pre-fill */}
                <View style={styles.demoSection}>
                  <Text style={styles.demoTitle}>Default Admin Login:</Text>
                  <TouchableOpacity
                    style={styles.demoChip}
                    onPress={() => {
                      setEmail('admin@example.com');
                      setPassword('admin123');
                      setError(null);
                    }}>
                    <Text style={styles.demoChipText}>
                      👤 admin@example.com (Password: admin123)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ================= COMPANY SIGN UP TAB ================= */
              <View>
                <View style={styles.infoBanner}>
                  <Text style={styles.infoBannerIcon}>✨</Text>
                  <Text style={styles.infoBannerText}>
                    Creates your company with isolated products, warehouse, categories, and accounting journals.
                  </Text>
                </View>

                {/* Company Type Chips */}
                <Text style={styles.label}>Company Structure</Text>
                <View style={styles.chipsRow}>
                  {COMPANY_TYPES.map((t) => (
                    <TouchableOpacity
                      key={t.key}
                      style={[
                        styles.chipBtn,
                        companyType === t.key && styles.chipBtnActive,
                      ]}
                      onPress={() => setCompanyType(t.key)}>
                      <Text
                        style={[
                          styles.chipText,
                          companyType === t.key && styles.chipTextActive,
                        ]}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Company Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Company Name *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🏢</Text>
                    <TextInput
                      value={companyName}
                      onChangeText={(val) => {
                        setCompanyName(val);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. Acme Industries Pvt Ltd"
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {/* GSTIN & Company Code */}
                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>GSTIN / Tax ID</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        value={gstin}
                        onChangeText={setGstin}
                        placeholder="07AAAAA0000A1Z5"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Company Code</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        value={companyCode}
                        onChangeText={setCompanyCode}
                        placeholder="ACME"
                        placeholderTextColor="#94A3B8"
                        autoCapitalize="characters"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </View>

                {/* Address Fields */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Registered Street Address</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>📍</Text>
                    <TextInput
                      value={street}
                      onChangeText={setStreet}
                      placeholder="123 Tech Park, Phase 1"
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>City</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        value={city}
                        onChangeText={setCity}
                        placeholder="Mumbai"
                        placeholderTextColor="#94A3B8"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>State</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        value={stateName}
                        onChangeText={setStateName}
                        placeholder="Maharashtra"
                        placeholderTextColor="#94A3B8"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.twoColRow}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.label}>Country</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        value={country}
                        onChangeText={setCountry}
                        placeholder="India"
                        placeholderTextColor="#94A3B8"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Zip / Pincode</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        value={zip}
                        onChangeText={setZip}
                        placeholder="400001"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.divider} />
                <Text style={styles.sectionHeading}>Company Admin Credentials</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Your Full Name *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      value={userName}
                      onChangeText={(val) => {
                        setUserName(val);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Work Email *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      value={userEmail}
                      onChangeText={(val) => {
                        setUserEmail(val);
                        if (error) setError(null);
                      }}
                      placeholder="rahul@company.com"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password (min 6 chars) *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>🔒</Text>
                    <TextInput
                      value={userPassword}
                      onChangeText={(val) => {
                        setUserPassword(val);
                        if (error) setError(null);
                      }}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      style={styles.textInput}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}>
                      <Text style={styles.eyeBtnText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>📞</Text>
                    <TextInput
                      value={userPhone}
                      onChangeText={setUserPhone}
                      placeholder="+91 9876543210"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    styles.signupBtn,
                    loading && styles.btnDisabled,
                  ]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.85}>
                  {loading ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator color="#FFFFFF" size="small" />
                      <Text style={styles.actionBtnText}> Setting up your company...</Text>
                    </View>
                  ) : (
                    <Text style={styles.actionBtnText}>Register Company & Get Started ➔</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer Notice */}
          <View style={styles.footerNotice}>
            <Text style={styles.footerNoticeText}>
              Isolated Multi-Tenant ERP & Master Data Architecture
            </Text>
            <Text style={styles.footerSubText}>
              Secured with JWT & Role-Based Access Control
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 36,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    width: '100%',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconEmoji: {
    fontSize: 34,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.pill,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  badgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    lineHeight: 18,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  infoBannerIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 17,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  chipBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipBtnActive: {
    backgroundColor: '#4353F0',
    borderColor: '#4353F0',
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  twoColRow: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: radius.sm,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.sm,
    height: 44,
  },
  inputIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  eyeBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: spacing.md,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  signupBtn: {
    backgroundColor: '#059669',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  demoSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  demoChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoChipText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  footerNotice: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  footerNoticeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  footerSubText: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
});
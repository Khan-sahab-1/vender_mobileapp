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
  Modal,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/auth';
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

  // Sign Up Mode: 'company' vs 'individual'
  const [signupType, setSignupType] = useState('company');

  // Common User Account fields
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Address fields (used by Company or Individual)
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [country, setCountry] = useState('India');
  const [zip, setZip] = useState('');

  // Company Specific fields
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('pvt_ltd');
  const [companyCode, setCompanyCode] = useState('');
  const [gstin, setGstin] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Individual Specific fields
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyList, setCompanyList] = useState([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [companySearch, setCompanySearch] = useState('');

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

  // Load companies for individual picker
  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const list = await authApi.getCompaniesList();
      if (Array.isArray(list)) {
        setCompanyList(list);
      }
    } catch {
      // keep fallback
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'signup' && signupType === 'individual') {
      fetchCompanies();
    }
  }, [activeTab, signupType]);

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
    if (!userName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!userEmail.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!userPassword || userPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (signupType === 'company') {
      if (!companyName.trim()) {
        setError('Please enter company name.');
        return;
      }
    } else {
      if (!selectedCompany?.id) {
        setError('Please select which company you belong to.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      if (signupType === 'company') {
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
      } else {
        await signup({
          registrationType: 'individual',
          name: userName.trim(),
          email: userEmail.trim(),
          password: userPassword,
          phone: userPhone.trim() || undefined,
          companyId: selectedCompany.id,
          street: street.trim() || undefined,
          city: city.trim() || undefined,
          state: stateName.trim() || undefined,
          country: country.trim() || 'India',
          zip: zip.trim() || undefined,
        });
      }
    } catch (e) {
      setError(getErrorMessage(e) || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companyList.filter((c) => {
    if (!companySearch.trim()) return true;
    const q = companySearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q)
    );
  });

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
              {/* <Text style={styles.badgeText}>MULTI-TENANT ERP CLOUD</Text> */}
            </View>
            <Text style={styles.appTitle}>ERP</Text>
            <Text style={styles.appSubtitle}>
              {activeTab === 'signin'
                ? 'Sign in to access your company inventory, products & master data.'
                : signupType === 'company'
                ? 'Register your company. Default warehouse, categories & units are set up automatically.'
                : 'Join as an individual and access your company workspace.'}
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
                  Register Account
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
              /* ================= SIGN UP TAB ================= */
              <View>
                {/* Mode Selector: Company vs Individual */}
                <View style={styles.typeSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.typeSelectorCard,
                      signupType === 'company' && styles.typeSelectorCardActive,
                    ]}
                    onPress={() => {
                      setSignupType('company');
                      setError(null);
                    }}
                    activeOpacity={0.8}>
                    <Text style={styles.typeCardIcon}>🏢</Text>
                    <Text
                      style={[
                        styles.typeCardTitle,
                        signupType === 'company' && styles.typeCardTitleActive,
                      ]}>
                      As Company
                    </Text>
                    <Text style={styles.typeCardSub}>Pvt Ltd, LLC, Prop.</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.typeSelectorCard,
                      signupType === 'individual' && styles.typeSelectorCardActive,
                    ]}
                    onPress={() => {
                      setSignupType('individual');
                      setError(null);
                      fetchCompanies();
                    }}
                    activeOpacity={0.8}>
                    <Text style={styles.typeCardIcon}>👤</Text>
                    <Text
                      style={[
                        styles.typeCardTitle,
                        signupType === 'individual' && styles.typeCardTitleActive,
                      ]}>
                      As Individual
                    </Text>
                    <Text style={styles.typeCardSub}>Join existing company</Text>
                  </TouchableOpacity>
                </View>

                {/* --- COMPANY FORM --- */}
                {signupType === 'company' ? (
                  <View>
                    <View style={styles.infoBanner}>
                      <Text style={styles.infoBannerIcon}>✨</Text>
                      <Text style={styles.infoBannerText}>
                        Creates your isolated tenant with its own products, warehouse, categories, and journals.
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
                          onChangeText={setCompanyName}
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
                  </View>
                ) : (
                  /* --- INDIVIDUAL FORM --- */
                  <View>
                    {/* Select Company Field */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Select Your Company *</Text>
                      <TouchableOpacity
                        style={[
                          styles.companyPickerBtn,
                          selectedCompany && styles.companyPickerBtnSelected,
                        ]}
                        onPress={() => {
                          fetchCompanies();
                          setShowCompanyModal(true);
                        }}
                        activeOpacity={0.8}>
                        <Text style={styles.pickerBtnIcon}>🏢</Text>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.pickerBtnText,
                              selectedCompany && styles.pickerBtnTextSelected,
                            ]}
                            numberOfLines={1}>
                            {selectedCompany
                              ? `${selectedCompany.name} (${selectedCompany.code || 'COMP'})`
                              : 'Tap to select company...'}
                          </Text>
                          {selectedCompany?.city && (
                            <Text style={styles.pickerBtnSubText}>
                              {selectedCompany.city}, {selectedCompany.state || selectedCompany.country}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.pickerChevron}>▼</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Address for Individual */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Personal / Work Address</Text>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputIcon}>📍</Text>
                        <TextInput
                          value={street}
                          onChangeText={setStreet}
                          placeholder="Address / Street"
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
                            placeholder="City"
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
                            placeholder="State"
                            placeholderTextColor="#94A3B8"
                            style={styles.textInput}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={styles.divider} />
                    <Text style={styles.sectionHeading}>Your Account Details</Text>
                  </View>
                )}

                {/* Common User Account Inputs */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      value={userName}
                      onChangeText={setUserName}
                      placeholder="e.g. Rahul Sharma"
                      placeholderTextColor="#94A3B8"
                      style={styles.textInput}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Login Email *</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>✉️</Text>
                    <TextInput
                      value={userEmail}
                      onChangeText={setUserEmail}
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
                      onChangeText={setUserPassword}
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
                      <Text style={styles.actionBtnText}> Creating Account...</Text>
                    </View>
                  ) : (
                    <Text style={styles.actionBtnText}>
                      {signupType === 'company'
                        ? 'Register Company & Get Started ➔'
                        : 'Join Company & Create Account ➔'}
                    </Text>
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

      {/* Modal for Selecting Company (Individual Flow) */}
      <Modal
        visible={showCompanyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCompanyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Company</Text>
              <TouchableOpacity
                onPress={() => setShowCompanyModal(false)}
                style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchWrapper}>
              <Text style={styles.inputIcon}>🔍</Text>
              <TextInput
                value={companySearch}
                onChangeText={setCompanySearch}
                placeholder="Search company by name or code..."
                placeholderTextColor="#94A3B8"
                style={styles.modalSearchInput}
              />
            </View>

            {loadingCompanies ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={styles.modalLoadingText}>Loading companies...</Text>
              </View>
            ) : (
              <ScrollView style={styles.companyScrollView}>
                {filteredCompanies.length === 0 ? (
                  <View style={styles.modalCenter}>
                    <Text style={styles.modalEmptyText}>No companies found.</Text>
                  </View>
                ) : (
                  filteredCompanies.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.companyListItem,
                        selectedCompany?.id === c.id && styles.companyListItemActive,
                      ]}
                      onPress={() => {
                        setSelectedCompany(c);
                        setShowCompanyModal(false);
                        setError(null);
                      }}>
                      <View style={styles.companyItemIconBox}>
                        <Text style={{ fontSize: 18 }}>🏢</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.companyItemName}>{c.name}</Text>
                        <Text style={styles.companyItemSub}>
                          Code: {c.code || 'N/A'} • {c.companyType?.toUpperCase() || 'PVT LTD'}
                          {c.city ? ` • ${c.city}` : ''}
                        </Text>
                      </View>
                      {selectedCompany?.id === c.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  typeSelectorRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: 10,
  },
  typeSelectorCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
  },
  typeSelectorCardActive: {
    borderColor: colors.primary,
    backgroundColor: '#EEF2FF',
  },
  typeCardIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  typeCardTitleActive: {
    color: colors.primary,
  },
  typeCardSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
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
  companyPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: radius.sm,
    backgroundColor: '#F8FAFC',
    padding: 10,
    minHeight: 48,
  },
  companyPickerBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F4FF',
  },
  pickerBtnIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  pickerBtnText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  pickerBtnTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },
  pickerBtnSubText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pickerChevron: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalCloseText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '600',
  },
  modalSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  companyScrollView: {
    maxHeight: 350,
  },
  companyListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  companyListItemActive: {
    backgroundColor: '#F0FDF4',
  },
  companyItemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  companyItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  companyItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 8,
  },
  modalCenter: {
    padding: 30,
    alignItems: 'center',
  },
  modalLoadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#64748B',
  },
});
import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { usersApi } from '../../api/users';
import Button from '../../components/Button';
import { ErrorBanner } from '../../components/Feedback';
import { colors, radius, spacing, typography, shadows } from '../../theme/theme';

const MODULES = [
  {
    key: 'sale',
    label: 'Sales',
    icon: '🛒',
    description: 'Quotations, sales orders, pricing & customers',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: '📦',
    description: 'Stock on hand, receipts, deliveries & adjustments',
  },
  {
    key: 'purchase',
    label: 'Purchase',
    icon: '🧾',
    description: 'Requests for quotations, purchase orders & vendors',
  },
  {
    key: 'accounting',
    label: 'Accounting & Finance',
    icon: '💰',
    description: 'Invoices, vendor bills, payments & financial reports',
  },
];

const ACCESS_LEVELS = [
  { key: 'none', label: 'None', color: '#6B7280', bg: '#F3F4F6' },
  { key: 'user', label: 'User', color: '#1E40AF', bg: '#DBEAFE' },
  { key: 'manager', label: 'Manager', color: '#065F46', bg: '#D1FAE5' },
  { key: 'management', label: 'Management', color: '#6D28D9', bg: '#EDE9FE' },
];

export default function UserFormScreen({ route, navigation }) {
  const existingUser = route.params?.user;
  const isEditing = Boolean(existingUser?.id);

  // Form states
  const [name, setName] = useState(existingUser?.name || '');
  const [email, setEmail] = useState(existingUser?.email || '');
  const [phone, setPhone] = useState(existingUser?.phone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState(
    existingUser?.userType === 'external' ? 'external' : 'internal',
  );
  const [isAdmin, setIsAdmin] = useState(
    Boolean(
      existingUser?.isAdmin ||
      existingUser?.role?.name === 'admin' ||
      existingUser?.userType === 'company_admin'
    ),
  );
  const [active, setActive] = useState(existingUser?.active !== false);

  // Module access rights
  const [accessRights, setAccessRights] = useState({
    sale: existingUser?.accessRights?.sale || (existingUser?.isAdmin ? 'management' : 'user'),
    inventory: existingUser?.accessRights?.inventory || (existingUser?.isAdmin ? 'management' : 'user'),
    purchase: existingUser?.accessRights?.purchase || (existingUser?.isAdmin ? 'management' : 'user'),
    accounting: existingUser?.accessRights?.accounting || (existingUser?.isAdmin ? 'management' : 'none'),
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Edit User' : 'New User',
    });
  }, [navigation, isEditing]);

  const handleToggleAdmin = value => {
    setIsAdmin(value);
    if (value) {
      setAccessRights({
        sale: 'management',
        inventory: 'management',
        purchase: 'management',
        accounting: 'management',
      });
    }
  };

  const handleSetModuleAccess = (moduleKey, levelKey) => {
    setAccessRights(prev => ({
      ...prev,
      [moduleKey]: levelKey,
    }));
  };

  const applyPreset = levelKey => {
    setAccessRights({
      sale: levelKey,
      inventory: levelKey,
      purchase: levelKey,
      accounting: levelKey,
    });
  };

  const validate = () => {
    if (!name.trim()) {
      setError('Please enter user full name.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (!isEditing && (!password || password.length < 6)) {
      setError('Password is required and must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setError(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        userType,
        isAdmin,
        accessRights: isAdmin
          ? {
              sale: 'management',
              inventory: 'management',
              purchase: 'management',
              accounting: 'management',
            }
          : accessRights,
      };

      if (password && password.trim()) {
        payload.password = password.trim();
      }

      if (isEditing) {
        payload.active = active;
        await usersApi.updateUser(existingUser.id, payload);
        Alert.alert('Success', 'User updated successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await usersApi.createUser(payload);
        Alert.alert('Success', 'User created successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Deactivate User',
      `Are you sure you want to deactivate ${existingUser.name || 'this user'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await usersApi.deleteUser(existingUser.id);
              Alert.alert('Deactivated', 'User has been deactivated.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              setError(err?.response?.data?.message || err?.message || 'Failed to deactivate user.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        {/* --- SECTION 1: BASIC INFORMATION --- */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Basic Information</Text>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Full Name <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Email Address <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. rahul@company.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Mobile Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. +91 9876543210"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.fieldLabel}>
                {isEditing ? 'New Password (Optional)' : 'Password'}
                {!isEditing && <Text style={styles.requiredAsterisk}> *</Text>}
              </Text>
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.togglePasswordText}>
                  {showPassword ? 'Hide 🙈' : 'Show 👁️'}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={
                isEditing
                  ? 'Leave blank to keep unchanged'
                  : 'Enter password (min 6 characters)'
              }
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            {isEditing ? (
              <Text style={styles.helperText}>
                Leave blank if you don't want to change the existing password.
              </Text>
            ) : null}
          </View>
        </View>

        {/* --- SECTION 2: USER TYPE --- */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>User Type</Text>
          <Text style={styles.sectionSubheading}>
            Select whether this user is an internal company member or external collaborator.
          </Text>

          <View style={styles.userTypeSelector}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                userType === 'internal' && styles.typeOptionSelected,
              ]}
              activeOpacity={0.8}
              onPress={() => setUserType('internal')}>
              <Text style={styles.typeOptionIcon}>🏢</Text>
              <Text
                style={[
                  styles.typeOptionTitle,
                  userType === 'internal' && styles.typeOptionTitleSelected,
                ]}>
                Internal User
              </Text>
              <Text style={styles.typeOptionDesc}>
                Employee, staff or department member inside company
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                userType === 'external' && styles.typeOptionSelected,
              ]}
              activeOpacity={0.8}
              onPress={() => setUserType('external')}>
              <Text style={styles.typeOptionIcon}>🌐</Text>
              <Text
                style={[
                  styles.typeOptionTitle,
                  userType === 'external' && styles.typeOptionTitleSelected,
                ]}>
                External User
              </Text>
              <Text style={styles.typeOptionDesc}>
                Consultant, partner, vendor contact or external auditor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* --- SECTION: ADMINISTRATION PRIVILEGES --- */}
        <View style={styles.sectionCard}>
          <View style={styles.switchRow}>
            <View style={styles.switchInfo}>
              <View style={styles.adminTitleRow}>
                <Text style={styles.adminBadgeIcon}>👑</Text>
                <Text style={styles.sectionHeading}>Administration</Text>
              </View>
              <Text style={styles.sectionSubheading}>
                {isAdmin
                  ? 'Administrator has full management access across all modules (Sale, Inventory, Purchase, Accounting) and company settings.'
                  : 'Make this user an Administrator with full system rights.'}
              </Text>
            </View>
            <Switch
              value={isAdmin}
              onValueChange={handleToggleAdmin}
              trackColor={{ false: '#D1D5DB', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
          {isAdmin && (
            <View style={styles.adminCallout}>
              <Text style={styles.adminCalloutText}>
                ✓ Administrator automatically receives Full Management rights on Sale, Inventory, Purchase, and Accounting.
              </Text>
            </View>
          )}
        </View>

        {/* --- SECTION 3: MODULE ACCESS RIGHTS --- */}
        <View style={styles.sectionCard}>
          <View style={styles.accessHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>Module Access Rights</Text>
              <Text style={styles.sectionSubheading}>
                Configure permissions for Sale, Inventory, Purchase, and Accounting.
              </Text>
            </View>
          </View>

          {/* Quick Presets */}
          <View style={styles.presetsWrapper}>
            <Text style={styles.presetsLabel}>Quick Presets:</Text>
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('management')}>
                <Text style={styles.presetChipText}>👑 All Management</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('manager')}>
                <Text style={styles.presetChipText}>👔 All Manager</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('user')}>
                <Text style={styles.presetChipText}>👤 All User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => applyPreset('none')}>
                <Text style={styles.presetChipText}>🚫 All None</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Module Selectors */}
          <View style={styles.modulesList}>
            {MODULES.map(mod => {
              const currentLevel = accessRights[mod.key] || 'none';
              return (
                <View key={mod.key} style={styles.moduleItem}>
                  <View style={styles.moduleHeader}>
                    <Text style={styles.moduleTitle}>
                      {mod.icon} {mod.label}
                    </Text>
                    <Text style={styles.moduleDesc}>{mod.description}</Text>
                  </View>

                  {/* Level segmented buttons */}
                  <View style={styles.levelSelector}>
                    {ACCESS_LEVELS.map(lvl => {
                      const isSelected = currentLevel === lvl.key;
                      return (
                        <TouchableOpacity
                          key={lvl.key}
                          style={[
                            styles.levelButton,
                            isSelected && {
                              backgroundColor: lvl.bg,
                              borderColor: lvl.color,
                            },
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleSetModuleAccess(mod.key, lvl.key)}>
                          <Text
                            style={[
                              styles.levelButtonText,
                              isSelected && {
                                color: lvl.color,
                                fontWeight: '700',
                              },
                            ]}>
                            {lvl.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* --- SECTION 4: STATUS (ACTIVE/INACTIVE) (Only when editing) --- */}
        {isEditing ? (
          <View style={styles.sectionCard}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.sectionHeading}>User Account Status</Text>
                <Text style={styles.sectionSubheading}>
                  {active
                    ? 'User can log in and access authorized company data.'
                    : 'User account is disabled and cannot log in.'}
                </Text>
              </View>
              <Switch
                value={active}
                onValueChange={setActive}
                trackColor={{ false: '#D1D5DB', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        ) : null}

        {/* --- BUTTONS --- */}
        <View style={styles.buttonGroup}>
          <Button
            title={isEditing ? 'Save Changes' : 'Create User'}
            onPress={handleSave}
            loading={saving}
            size="lg"
          />

          {isEditing && (
            <Button
              title="Deactivate User"
              variant="ghost"
              onPress={handleDelete}
              loading={deleting}
              textStyle={{ color: colors.danger }}
              style={styles.deleteButton}
            />
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl * 2,
    gap: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.text,
    marginBottom: 4,
  },
  sectionSubheading: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: colors.danger,
  },
  togglePasswordText: {
    ...typography.captionBold,
    color: colors.primary,
    fontSize: 12,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  helperText: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 4,
  },
  userTypeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F3FF',
  },
  typeOptionIcon: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },
  typeOptionTitle: {
    ...typography.captionBold,
    color: colors.text,
    marginBottom: 4,
  },
  typeOptionTitleSelected: {
    color: colors.primary,
  },
  typeOptionDesc: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 15,
  },
  accessHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  presetsWrapper: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetsLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  modulesList: {
    gap: spacing.md,
  },
  moduleItem: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.sm,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moduleHeader: {
    marginBottom: spacing.sm,
  },
  moduleTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },
  moduleDesc: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  levelSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  levelButton: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelButtonText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  buttonGroup: {
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  deleteButton: {
    marginTop: spacing.xs,
  },
  adminTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  adminBadgeIcon: {
    fontSize: 18,
  },
  adminCallout: {
    marginTop: spacing.sm,
    backgroundColor: '#EDE9FE',
    padding: spacing.sm + 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  adminCalloutText: {
    ...typography.captionBold,
    color: '#6D28D9',
    fontSize: 12,
    lineHeight: 16,
  },
});


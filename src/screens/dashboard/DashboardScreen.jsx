import React, { useRef } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors as C } from '../../theme/theme';

const COMING_SOON = [
  {
    key: 'Sales',
    icon: '🛒',
    title: 'Sales',
    subtitle: 'Customers, quotations & sales orders',
    screen: 'SalesMenu',
  },
  {
    key: 'Purchase',
    icon: '🧾',
    title: 'Purchase',
    subtitle: 'Vendors, purchase orders & bills',
    screen: 'Purchasedashboard',
  },
  {
    key: 'Accounting',
    icon: '📊',
    title: 'Accounting',
    subtitle: 'COA, Groups, Journals & Bills',
    screen: 'AccountingMenu',
  },
  {
    key: 'Settings',
    icon: '⚙️',
    title: 'Settings',
    subtitle: 'Divisions, users & access control',
    screen: 'Settings',
  },
];

function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* Pressable wrapper: subtle scale that answers the person's touch. */
function Touchable({ onPress, style, children, label }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = v =>
    Animated.spring(scale, {
      toValue: v,
      speed: 40,
      bounciness: 0,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        accessibilityRole="button"
        accessibilityLabel={label}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

/* The live module gets the spotlight. */
function FeaturedCard({ onPress }) {
  const heights = [0.4, 0.62, 0.5, 0.85, 1];
  return (
    <Touchable
      onPress={onPress}
      label="Inventory. Products, categories, units of measure, warehouses and more."
      style={styles.featuredShadow}>
      <View style={styles.featured}>
        <View style={styles.featuredTop}>
          <View style={styles.featuredIcon}>
            <Text style={styles.featuredEmoji}>📦</Text>
          </View>
          <View
            style={styles.miniBars}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {heights.map((h, i) => {
              const isLast = i === heights.length - 1;
              return (
                <View
                  key={i}
                  style={[
                    styles.miniBar,
                    isLast ? styles.miniBarLast : styles.miniBarDefault,
                    { height: 44 * h },
                  ]}
                />
              );
            })}
          </View>
        </View>

        <Text style={styles.featuredTitle}>Inventory</Text>
        <Text style={styles.featuredSub}>
          Products, categories, units of measure, warehouses & more
        </Text>

        <View style={styles.openPill}>
          <Text style={styles.openPillText}>Open inventory</Text>
        </View>
      </View>
    </Touchable>
  );
}

function ModuleTile({ item, onPress }) {
  return (
    <Touchable
      onPress={onPress}
      label={`${item.title}. ${item.subtitle}.${item.screen ? '' : ' Coming soon.'}`}
      style={styles.tileOuter}>
      <View style={styles.tile}>
        <View style={styles.tileIcon}>
          <Text style={styles.tileEmoji}>{item.icon}</Text>
        </View>
        <Text style={styles.tileTitle}>{item.title}</Text>
        <Text style={styles.tileSub} numberOfLines={3}>
          {item.subtitle}
        </Text>
        {!item.screen && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Coming soon</Text>
          </View>
        )}
      </View>
    </Touchable>
  );
}



export default function DashboardScreen({ navigation }) {
  const { user } = useAuth();
  const fullName = user?.name?.trim() || '';
  const firstName = fullName ? fullName.split(' ')[0] : 'there';
  const companyName =
    (typeof user?.company === 'object' ? user?.company?.name : user?.company) || '';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.ink} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greetingForNow()},{'\n'}
            {firstName} {companyName ? <Text style={styles.companyName}>({companyName})</Text> : null}
          </Text>
        </View>

        {/* Body */}
        <View style={styles.body}>
          <FeaturedCard onPress={() => navigation.navigate('InventoryMenu')} />

          <Text style={styles.sectionTitle}>More modules</Text>
          <View style={styles.grid}>
            {COMING_SOON.map(item => (
              <ModuleTile
                key={item.key}
                item={item}
                onPress={() =>
                  navigation.navigate(
                    item.screen ?? 'ComingSoon',
                    item.screen ? undefined : { title: item.title },
                  )
                }
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.ink },
  scroll: { flexGrow: 1 },

  /* Header */
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  greeting: {
    color: C.onInk,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  companyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  subheading: {
    color: C.onInkMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },

  /* Body sheet */
  body: {
    flexGrow: 1,
    backgroundColor: C.background,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },

  /* Featured card */
  featuredShadow: Platform.select({
    ios: {
      shadowColor: C.primary,
      shadowOpacity: 0.3,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
    },
    android: { elevation: 8 },
  }),
  featured: {
    backgroundColor: C.primary,
    borderRadius: 24,
    padding: 22,
  },
  featuredTop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featuredIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredEmoji: { fontSize: 28 },
  miniBars: { flexDirection: 'row', alignItems: 'flex-end', height: 44 },
  miniBar: { width: 10, borderRadius: 4, marginLeft: 6 },
  miniBarDefault: { backgroundColor: 'rgba(255,255,255,0.35)' },
  miniBarLast: { backgroundColor: C.amber },
  featuredTitle: {
    color: C.onInk,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  featuredSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    maxWidth: 280,
  },
  openPill: {
    alignSelf: 'flex-start',
    backgroundColor: C.onInk,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 20,
  },
  openPillText: { color: C.primary, fontSize: 14, fontWeight: '700' },

  /* Grid */
  sectionTitle: {
    color: C.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 32,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tileOuter: { width: '48%', marginBottom: 14 },
  tile: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    minHeight: 190,
  },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tileEmoji: { fontSize: 22 },
  tileTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  tileSub: {
    color: C.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    flexGrow: 1,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: C.amberSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  badgeText: { color: C.amberText, fontSize: 12, fontWeight: '700' },
});

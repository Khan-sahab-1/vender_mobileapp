import React, { useRef, useState } from 'react'
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const COLORS = {
  bg: '#EEF2F5',
  ink: '#0E1B2A',
  bar: '#0E1B2A',
  idle: '#7C8BA0',
  muted: '#5B6B80',
}

const TABS = [
  { key: 'inventory', label: 'Inventory', icon: 'cube-outline', iconActive: 'cube', color: '#4FD1C5' },
  { key: 'purchase', label: 'Purchase', icon: 'cart-outline', iconActive: 'cart', color: '#F6B94C' },
  { key: 'sale', label: 'Sale', icon: 'pricetag-outline', iconActive: 'pricetag', color: '#FF7A6B' },
  { key: 'finance', label: 'Finance', icon: 'wallet-outline', iconActive: 'wallet', color: '#8FA8FF' },
]

const ComingSoon = ({ tab }) => (
  <View style={styles.screen}>
    <View style={[styles.badge, { backgroundColor: tab.color + '33' }]}>
      <Ionicons name={tab.iconActive} size={40} color={COLORS.ink} />
    </View>
    <Text style={styles.screenTitle}>{tab.label}</Text>
    <Text style={styles.soon}>Coming soon</Text>
    <Text style={styles.soonSub}>Yeh section abhi ban raha hai.</Text>
  </View>
)

const TabItem = ({ tab, focused, onPress }) => {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current

  React.useEffect(() => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [focused])

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: [48, 122] })
  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0)', tab.color],
  })
  const labelOpacity = anim.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: 'clamp' })

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={tab.label}
      hitSlop={6}
    >
      <Animated.View style={[styles.tab, { width, backgroundColor: bg }]}>
        <Ionicons
          name={focused ? tab.iconActive : tab.icon}
          size={22}
          color={focused ? COLORS.ink : COLORS.idle}
        />
        <Animated.Text
          numberOfLines={1}
          style={[styles.tabLabel, { opacity: labelOpacity }]}
        >
          {tab.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  )
}

const Bottomtab = () => {
  const [active, setActive] = useState(TABS[0].key)
  const current = TABS.find((t) => t.key === active)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />

      <ComingSoon tab={current} />

      <View style={styles.barWrap} pointerEvents="box-none">
        <View style={styles.bar} accessibilityRole="tablist">
          {TABS.map((tab) => (
            <TabItem
              key={tab.key}
              tab={tab}
              focused={tab.key === active}
              onPress={() => setActive(tab.key)}
            />
          ))}
        </View>
      </View>
    </View>
  )
}

export default Bottomtab

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 90,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.ink,
    letterSpacing: -0.3,
  },
  soon: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.muted,
  },
  soonSub: {
    marginTop: 4,
    fontSize: 14,
    color: COLORS.muted,
  },
  barWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 36,
    backgroundColor: COLORS.bar,
    shadowColor: '#0E1B2A',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tab: {
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.ink,
  },
})
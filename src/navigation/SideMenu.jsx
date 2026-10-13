import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  BackHandler,
} from 'react-native';
import { colors } from '../theme/theme';

const DRAWER_WIDTH = Math.min(300, Dimensions.get('window').width * 0.8);

const SideMenuContext = createContext(null);
export const useSideMenu = () => useContext(SideMenuContext);

/**
 * Minimal drawer/side-menu implementation built on RN's core Animated API.
 * Avoids react-native-reanimated so it has zero extra native-linking
 * requirements beyond what's already in this project.
 */
export default function SideMenu({ renderContent, children }) {
  const [open, setOpen] = useState(false);
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const animateTo = toOpen => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: toOpen ? 0 : -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: toOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const openDrawer = () => {
    setOpen(true);
    requestAnimationFrame(() => animateTo(true));
  };
  const closeDrawer = () => {
    animateTo(false);
    setTimeout(() => setOpen(false), 220);
  };

  useEffect(() => {
    if (!open) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      closeDrawer();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <SideMenuContext.Provider value={{ openDrawer, closeDrawer, isOpen: open }}>
      <View style={styles.root}>
        {children}

        {open ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
              style={[styles.overlay, { opacity: overlayOpacity }]}
              pointerEvents={open ? 'auto' : 'none'}>
              <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDrawer} />
            </Animated.View>

            <Animated.View
              style={[styles.drawer, { transform: [{ translateX }] }]}>
              {renderContent({ closeDrawer })}
            </Animated.View>
          </View>
        ) : null}
      </View>
    </SideMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors.surface,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
});

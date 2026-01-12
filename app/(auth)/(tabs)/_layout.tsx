import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useState, useCallback } from 'react';
import { useTypography } from '@/src/lib/typography-context';
import { ProjectsProvider } from '@/src/lib/projects-context';
import { spring } from '@/src/theme/animations';
import { useHaptics } from '@/src/hooks/useHaptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

// Tab configuration
const TAB_CONFIG = [
  { name: 'index', label: 'Home', icon: 'home-outline' as const },
  { name: 'projects', label: 'Projects', icon: 'folder-outline' as const },
  { name: 'settings', label: 'Settings', icon: 'settings-outline' as const },
];

// Custom animated tab bar with sliding pill
function AnimatedTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { getColors } = useTypography();
  const colors = getColors();
  const haptics = useHaptics();

  // Track tab widths for pill positioning
  const [tabWidths, setTabWidths] = useState<number[]>([]);
  const [tabBarWidth, setTabBarWidth] = useState(0);

  // Animated pill position
  const pillPosition = useSharedValue(0);

  // Handle tab bar layout
  const handleTabBarLayout = useCallback((event: LayoutChangeEvent) => {
    setTabBarWidth(event.nativeEvent.layout.width);
  }, []);

  // Handle individual tab layout
  const handleTabLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const width = event.nativeEvent.layout.width;
      setTabWidths((prev) => {
        const newWidths = [...prev];
        newWidths[index] = width;
        return newWidths;
      });
    },
    []
  );

  // Calculate pill position based on active tab
  const calculatePillPosition = useCallback(
    (index: number) => {
      if (tabWidths.length === 0 || tabBarWidth === 0) return 0;
      const tabWidth = tabBarWidth / TAB_CONFIG.length;
      return index * tabWidth + (tabWidth - 48) / 2; // 48 is pill width
    },
    [tabWidths, tabBarWidth]
  );

  // Update pill position when active tab changes
  const activeIndex = state.index;
  const targetPosition = calculatePillPosition(activeIndex);

  // Animate pill to new position
  pillPosition.value = withSpring(targetPosition, spring.tabBarPill);

  // Animated pill style
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillPosition.value }],
  }));

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.backgroundSecondary,
          borderTopColor: colors.border,
        },
      ]}
      onLayout={handleTabBarLayout}
    >
      {/* Animated sliding pill */}
      <Animated.View
        style={[
          styles.pill,
          { backgroundColor: colors.primary },
          pillStyle,
        ]}
      />

      {/* Tab buttons */}
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const config = TAB_CONFIG.find((t) => t.name === route.name) || TAB_CONFIG[0];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            haptics.selection();
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            onLayout={handleTabLayout(index)}
            style={styles.tab}
          >
            <View style={styles.iconContainer}>
              {/* Active indicator bar */}
              {isFocused && (
                <View
                  style={[
                    styles.activeIndicator,
                    { backgroundColor: colors.primary },
                  ]}
                />
              )}
              <Ionicons
                name={config.icon}
                size={24}
                color={isFocused ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isFocused ? colors.primary : colors.textSecondary,
                  fontWeight: isFocused ? '600' : '500',
                },
              ]}
            >
              {config.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  // Get dynamic colors from typography context
  const { getColors } = useTypography();
  const colors = getColors();

  return (
    <ProjectsProvider>
      <Tabs
        tabBar={(props) => <AnimatedTabBar {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.backgroundSecondary,
            borderBottomWidth: 0,
            shadowOpacity: 0,
            elevation: 0,
          },
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            color: colors.text,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarAccessibilityLabel: 'Home tab',
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Projects',
            headerShown: false,
            tabBarAccessibilityLabel: 'Projects tab',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarAccessibilityLabel: 'Settings tab',
          }}
        />
      </Tabs>
    </ProjectsProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    minHeight: 64,
    paddingBottom: 10,
    paddingTop: 6,
    borderTopWidth: 1,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 10,
    width: 48,
    height: 32,
    borderRadius: 14,
    opacity: 0.15,
    zIndex: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 48,
    height: 32,
  },
  activeIndicator: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});

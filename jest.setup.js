// Jest setup file for React Native Testing Library
// Import matchers from @testing-library/react-native (v13+ uses built-in matchers)
import '@testing-library/react-native';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Redirect: ({ href }) => null,
  Stack: ({ children }) => children,
  Tabs: ({ children }) => children,
  Link: ({ children }) => children,
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(() => Promise.resolve()),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock the supabase module directly to avoid env validation
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      refreshSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
  },
  isNetworkError: jest.fn(() => false),
  withOfflineHandling: jest.fn(),
  validateSupabaseConnection: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase SDK (for type imports)
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock expo internals that can cause issues in tests
jest.mock('expo/src/winter/runtime.native', () => ({}), { virtual: true });
jest.mock('expo/src/winter/installGlobal', () => ({}), { virtual: true });

// Mock expo-av for video playback tests
jest.mock('expo-av', () => ({
  Video: 'Video',
  ResizeMode: {
    CONTAIN: 'contain',
    COVER: 'cover',
    STRETCH: 'stretch',
  },
  AVPlaybackStatus: {},
}));

// Mock react-native-webview for WebView tests
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const React = require('react');

  const View = RN.View;
  const Text = RN.Text;

  // Create mock Animated components
  const createMockAnimatedComponent = (Component) => {
    return React.forwardRef((props, ref) => {
      return React.createElement(Component, { ...props, ref });
    });
  };

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: createMockAnimatedComponent,
      View,
      Text,
    },
    View: View,
    Text: Text,
    useSharedValue: (initialValue) => ({ value: initialValue }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withSpring: (value) => value,
    withTiming: (value, _config, callback) => {
      if (callback) callback();
      return value;
    },
    withSequence: (...values) => values[values.length - 1],
    withDelay: (_delay, value) => value,
    withRepeat: (value) => value,
    runOnJS: (fn) => fn,
    interpolate: () => 0,
    Extrapolation: {
      CLAMP: 'clamp',
    },
    Easing: {
      linear: (t) => t,
      ease: (t) => t,
      in: (fn) => fn,
      out: (fn) => fn,
      inOut: (fn) => fn,
      back: () => (t) => t,
      quad: (t) => t * t,
      cubic: (t) => t * t * t,
    },
    FadeIn: { delay: () => ({}) },
    FadeOut: { duration: () => ({}) },
    SlideInUp: { delay: () => ({}), springify: () => ({ damping: () => ({}) }) },
    SlideOutDown: {},
    BounceIn: {},
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Gesture: {
      Pan: jest.fn(() => ({
        enabled: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      })),
      Tap: jest.fn(() => ({
        enabled: jest.fn().mockReturnThis(),
        maxDuration: jest.fn().mockReturnThis(),
        numberOfTaps: jest.fn().mockReturnThis(),
        maxDelay: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
      })),
      Simultaneous: jest.fn(() => ({})),
      Exclusive: jest.fn(() => ({})),
    },
    GestureDetector: ({ children }) => children,
    GestureHandlerRootView: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    LongPressGestureHandler: View,
  };
});

// Mock react-native-svg for MasteryRing
jest.mock('react-native-svg', () => {
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: View,
    Svg: View,
    Circle: View,
    Rect: View,
    Path: View,
    G: View,
    Text: View,
    Line: View,
    Polygon: View,
    Polyline: View,
    Defs: View,
    LinearGradient: View,
    Stop: View,
    ClipPath: View,
  };
});

// Silence console warnings during tests (optional, remove if you want to see warnings)
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Please update the following components')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});

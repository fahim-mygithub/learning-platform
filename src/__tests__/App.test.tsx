/**
 * Sample Test File - App Infrastructure Tests
 *
 * Demonstrates testing patterns for React Native with Expo.
 * Uses React Native Testing Library for component testing.
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View, Pressable } from 'react-native';

/**
 * Sample component for testing
 */
function Greeting({ name }: { name: string }) {
  return (
    <View testID="greeting-container">
      <Text testID="greeting-text">Hello, {name}!</Text>
    </View>
  );
}

/**
 * Interactive button component for testing user interactions
 */
function Counter() {
  const [count, setCount] = React.useState(0);
  return (
    <View>
      <Text testID="count">{count}</Text>
      <Pressable testID="increment-button" onPress={() => setCount(c => c + 1)}>
        <Text>Increment</Text>
      </Pressable>
    </View>
  );
}

describe('React Native Testing Library Setup', () => {
  it('renders basic components correctly', () => {
    render(
      <View testID="container">
        <Text testID="hello">Hello, World!</Text>
      </View>
    );

    expect(screen.getByTestId('container')).toBeTruthy();
    expect(screen.getByTestId('hello')).toHaveTextContent('Hello, World!');
  });

  it('supports accessibility queries', () => {
    render(
      <View>
        <Text accessibilityLabel="Welcome message">Welcome to the app</Text>
      </View>
    );

    expect(screen.getByLabelText('Welcome message')).toBeTruthy();
  });

  it('renders custom components with props', () => {
    render(<Greeting name="Developer" />);

    expect(screen.getByTestId('greeting-container')).toBeTruthy();
    expect(screen.getByTestId('greeting-text')).toHaveTextContent('Hello, Developer!');
  });

  it('can query by text content', () => {
    render(<Greeting name="Tester" />);

    expect(screen.getByText('Hello, Tester!')).toBeTruthy();
  });
});

describe('Component State Testing', () => {
  it('renders initial state correctly', () => {
    render(<Counter />);

    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('renders button with correct accessibility', () => {
    render(<Counter />);

    expect(screen.getByTestId('increment-button')).toBeTruthy();
    expect(screen.getByText('Increment')).toBeTruthy();
  });
});

describe('Jest Configuration', () => {
  it('can run basic assertions', () => {
    expect(1 + 1).toBe(2);
    expect([1, 2, 3]).toHaveLength(3);
    expect({ a: 1 }).toEqual({ a: 1 });
  });

  it('can use async/await', async () => {
    const result = await Promise.resolve('test');
    expect(result).toBe('test');
  });

  it('can use jest mock functions', () => {
    const mockFn = jest.fn();
    mockFn('hello');
    expect(mockFn).toHaveBeenCalledWith('hello');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

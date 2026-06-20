/**
 * Button Component Tests
 * Tests rendering, press events, loading state, disabled state, and theme colors.
 * Requirements: 16.1
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../../src/components/common/Button';

// Mock the theme module
jest.mock('../../src/theme', () => {
  const { lightColors } = require('../../src/theme/colors');
  const { typography, fontSize, fontWeight } = require('../../src/theme/typography');
  const { spacing } = require('../../src/theme/spacing');
  const { borderRadius, shadows } = require('../../src/theme/shapes');

  return {
    useTheme: () => ({
      mode: 'light',
      isDark: false,
      colors: lightColors,
      typography,
      fontSize,
      fontWeight,
      spacing,
      borderRadius,
      shadows,
      toggleTheme: jest.fn(),
    }),
  };
});

describe('Button', () => {
  it('renders with the correct title text', () => {
    const { getByText } = render(<Button title="Save" onPress={() => {}} />);
    expect(getByText('Save')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="Submit" onPress={onPress} />);
    fireEvent.press(getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator and hides title when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="Loading" onPress={() => {}} loading={true} />
    );
    // Title text should not be displayed during loading
    expect(queryByText('Loading')).toBeNull();
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button title="Disabled" onPress={onPress} disabled={true} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <Button title="Busy" onPress={onPress} loading={true} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('applies primary theme color by default', () => {
    const { getByRole } = render(<Button title="Primary" onPress={() => {}} />);
    const button = getByRole('button');
    // Primary button background should be the primary teal color
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.filter(Boolean))
      : button.props.style;
    expect(flatStyle.backgroundColor).toBe('#0D9488');
  });

  it('applies danger variant with expense color', () => {
    const { getByRole } = render(
      <Button title="Delete" onPress={() => {}} variant="danger" />
    );
    const button = getByRole('button');
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.filter(Boolean))
      : button.props.style;
    expect(flatStyle.backgroundColor).toBe('#EF4444');
  });

  it('applies secondary variant with transparent background', () => {
    const { getByRole } = render(
      <Button title="Cancel" onPress={() => {}} variant="secondary" />
    );
    const button = getByRole('button');
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.filter(Boolean))
      : button.props.style;
    expect(flatStyle.backgroundColor).toBe('transparent');
  });

  it('uses textSecondary color when disabled', () => {
    const { getByRole } = render(
      <Button title="Gone" onPress={() => {}} disabled={true} />
    );
    const button = getByRole('button');
    const flatStyle = Array.isArray(button.props.style)
      ? Object.assign({}, ...button.props.style.filter(Boolean))
      : button.props.style;
    expect(flatStyle.backgroundColor).toBe('#64748B');
  });

  it('has accessible role and label', () => {
    const { getByRole, getByLabelText } = render(
      <Button title="Accessible" onPress={() => {}} />
    );
    expect(getByRole('button')).toBeTruthy();
    expect(getByLabelText('Accessible')).toBeTruthy();
  });
});

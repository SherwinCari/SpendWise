/**
 * Card Component Tests
 * Tests rendering children, applying themed styling, and elevated variant.
 * Requirements: 16.1
 */

import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import Card from '../../src/components/common/Card';

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

describe('Card', () => {
  it('renders children correctly', () => {
    const { getByText } = render(
      <Card>
        <Text>Card Content</Text>
      </Card>
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('renders multiple children', () => {
    const { getByText } = render(
      <Card>
        <Text>First</Text>
        <Text>Second</Text>
      </Card>
    );
    expect(getByText('First')).toBeTruthy();
    expect(getByText('Second')).toBeTruthy();
  });

  it('applies themed background color', () => {
    const { toJSON } = render(
      <Card>
        <Text>Content</Text>
      </Card>
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.backgroundColor).toBe('#FFFFFF');
  });

  it('applies 12px card border radius', () => {
    const { toJSON } = render(
      <Card>
        <Text>Content</Text>
      </Card>
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.borderRadius).toBe(12);
  });

  it('applies base spacing as padding', () => {
    const { toJSON } = render(
      <Card>
        <Text>Content</Text>
      </Card>
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.padding).toBe(16);
  });

  it('applies elevated shadow when elevated prop is true', () => {
    const { toJSON } = render(
      <Card elevated>
        <Text>Elevated</Text>
      </Card>
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    // Elevated cards have a stronger shadow (radius 24 vs 12)
    expect(flatStyle.shadowRadius).toBe(24);
  });

  it('applies custom styles via style prop', () => {
    const customStyle = { marginTop: 20 };
    const { toJSON } = render(
      <Card style={customStyle}>
        <Text>Styled</Text>
      </Card>
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.marginTop).toBe(20);
  });
});

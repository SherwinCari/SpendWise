/**
 * Mock for react-native-vector-icons (all icon sets).
 */
const React = require('react');
const { Text } = require('react-native');

function MockIcon(props) {
  return React.createElement(Text, { testID: 'mock-icon' }, props.name || '');
}

MockIcon.getImageSource = jest.fn(() => Promise.resolve({}));
MockIcon.getImageSourceSync = jest.fn(() => ({}));
MockIcon.loadFont = jest.fn(() => Promise.resolve());
MockIcon.hasIcon = jest.fn(() => true);

module.exports = MockIcon;
module.exports.default = MockIcon;

// Jest setup placeholder. Add shared mocks/configuration for React Native tests here.

// Mock useWindowDimensions — required by useBookGridLayout and other screens.
// React Native's useWindowDimensions does a lazy require that can run after Jest
// environment teardown when used in tests. Mock it globally to avoid ReferenceError.
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => () => ({
  width: 390,
  height: 844,
  scale: 2,
  fontScale: 1,
}));

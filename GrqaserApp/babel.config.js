module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
          '@screens': './src/screens',
          '@navigation': './src/navigation',
          '@state': './src/state',
          '@services': './src/services',
          '@constants': './src/constants',
          '@components': './src/components',
          '@utils': './src/utils',
          '@types': './src/types',
          '@assets': './src/assets',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};

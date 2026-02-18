const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'react-native-paper') {
        return context.resolveRequest(
          context,
          'react-native-paper/lib/commonjs/index.js',
          platform,
        );
      }

      if (moduleName === '@react-native-vector-icons/material-design-icons') {
        return context.resolveRequest(
          context,
          'react-native-vector-icons/MaterialCommunityIcons',
          platform,
        );
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

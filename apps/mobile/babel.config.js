module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'react' }],
    ],
    plugins: [
      // Handle the require statements for Metro
      ['babel-plugin-module-resolver', {
        alias: {
          'crypto': 'expo-crypto',
          'stream': 'stream-browserify',
        },
      }],
      // Enable React Native reanimated - must be last
      'react-native-reanimated/plugin',
    ],
  };
};
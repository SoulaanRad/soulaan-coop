const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Enable web platform
config.resolver.platforms = ['web', 'ios', 'android'];

module.exports = config;
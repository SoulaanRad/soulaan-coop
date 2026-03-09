const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');
const os = require('os');

if (!os.availableParallelism) {
  os.availableParallelism = () => os.cpus().length;
}
 
const config = getDefaultConfig(__dirname)
 
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16  })
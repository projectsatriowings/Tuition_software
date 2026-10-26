const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for Monorepos:
 * 1. Defines `REACT_NATIVE_NODE_MODULES_DIR` dynamically so that native libraries
 *    like react-native-screens and react-native-reanimated can locate hoisted react-native.
 * 2. Exposes compileSdkVersion, targetSdkVersion, minSdkVersion, etc. on rootProject.ext
 *    so subprojects can access them.
 */
const withMonorepoFix = (config) => {
  // 1. Fix app/build.gradle
  config = withAppBuildGradle(config, (modConfig) => {
    if (!modConfig.modResults.contents.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
      const injection = `
// [Monorepo Fix] Set REACT_NATIVE_NODE_MODULES_DIR for native libraries
project.ext.REACT_NATIVE_NODE_MODULES_DIR = new File(["node", "--print", "require.resolve('react-native/package.json')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath()
`;
      modConfig.modResults.contents = injection + modConfig.modResults.contents;
    }
    return modConfig;
  });

  // 2. Fix root android/build.gradle
  config = withProjectBuildGradle(config, (modConfig) => {
    if (!modConfig.modResults.contents.includes('// [Monorepo Fix] Expose rootProject.ext')) {
      const injection = `
// [Monorepo Fix] Expose rootProject.ext for subprojects like react-native-screens
ext {
    compileSdkVersion = Integer.parseInt(findProperty('android.compileSdkVersion') ?: '34')
    targetSdkVersion = Integer.parseInt(findProperty('android.targetSdkVersion') ?: '34')
    minSdkVersion = Integer.parseInt(findProperty('android.minSdkVersion') ?: '23')
    buildToolsVersion = findProperty('android.buildToolsVersion') ?: '34.0.0'
    kotlinVersion = findProperty('android.kotlinVersion') ?: '1.9.23'
}
`;
      modConfig.modResults.contents = injection + modConfig.modResults.contents;
    }
    return modConfig;
  });

  return config;
};

module.exports = withMonorepoFix;
